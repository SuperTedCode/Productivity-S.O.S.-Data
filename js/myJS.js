//Global variables
var moteArray = [];
var motedetail;
var mote;
var motes;
var startDate;
var endDate;
var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
var diffDays;
var graphCount =1;
var chartType;
var graphArrays = {};
var title;
var detailContent;

/* Set the width of the side navigation to 250px */
function openNav() {
    document.getElementById("build").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
};

/* Set the width of the side navigation to 0 */
function closeNav() {
    document.getElementById("build").style.width = "0";
    document.getElementById("main").style.marginLeft = "0";
};
//*************  http://api.jqueryui.com/datepicker ***********************8
// API for the date input fields used for the SQL query, Format set for mySQL.
$.datepicker.setDefaults({
  dateFormat: "yy-mm-dd"
});

$(function() {
  $("#start_date").datepicker();
  $("#end_date").datepicker();
});
//************************************************************************************************************************
// Function used to remove graph when user hits X button.
function removeDiv(value) {
  $('div[id='+value+']').remove();
};
//************************************************************************************************************************
// Function used to reset buttons as user does not want to draw graph. Allows user to enter different inputs
function reset() {
  $('#details').toggle();
  $('#draw').toggle();
  $('#reset').toggle();
  // clear the selection from the form fields after graph is setup
  $("input[type=text], textarea").val("");
};

//*************************************************************************************************************************
//HTTP request for mote location using getMotesLoc.php
window.onload = function() {
  var motesReq = new XMLHttpRequest();
  
  motesReq.onload = function() {
    motes =JSON.parse(this.responseText);
    // Loop through the array to create the table rows in HTML
    var content = "<table><tbody><tr><th colspan='2'>Sensor types</th></tr><tr><th>Name</th><th>Unit</th></tr>";
    for (var i=0;i<motes.length;i++) {
      if(motes[i].name){ //filter out the objects in the array for mote id and location
        content += "<tr><td>"+motes[i].name+"</td><td>"+motes[i].unit+"</td><tr>";
      }
    };

    content += "<tr><th colspan='2'>Mote List</th></tr><tr><th>location</th><th>Mote ID</th></tr>"; // Add seperate headings for mote locations
    
    for (var i=0;i<motes.length;i++) {
      if(motes[i].mote){ //Filter out the objexts in the array for sensor name and unit
        content += "<tr><td>"+motes[i].mote+"</td><td>"+motes[i].location+"</td><tr>";
      }
    };
    content += "</tbody></table>"; //close the table tags
    $("#motes").append(content); //append HTMl to div with id motes
  };

  motesReq.open("get", "php/getMotesLoc.php", true);
  motesReq.send();
};
//*************************************************************************************************************************
//Store the user inputs and apply it to two AJAX request, one to get mote detals and second to get the raw data for the sensors in that mote
function getData() { // Function called when user hits butoon "Get Mote Details & Data"
  Pace.restart();
  mote = $('#mote').val();
  startDate = new Date($('#start_date').val()); //converted to date object to make sure user entered valid date
  endDate = new Date($('#end_date').val());
  chartType = $('input:checked').val(); // Get chart type from user
  diffDays = Math.round(Math.abs((startDate.getTime() - endDate.getTime())/(oneDay))); //Get the # of days from start and end dates
  if(diffDays>61 | diffDays<2) {
    alert("Min/Max date rage allowed is 2 and 60 days. Current range is "+diffDays);
  }
  else if(mote && !isNaN(startDate.getDate()) && !isNaN(endDate.getDate())) { // start and end dates checked for date value which ensures valid date object
  //set up variables as cookies for get_detail and get_data php scripts with 1 day expirey
  var toDay = new Date();
  toDay.setDate(toDay.getDate() + 1); // Set to one day
  var tomorrow = toDay.toUTCString();
  //setup cookie values
  document.cookie = "mote="+mote+"; expires="+tomorrow+"; path=/";
  document.cookie = "startDate="+$('#start_date').val()+"; expires="+tomorrow; // Cookie is stored as string so we do not use date object.
  document.cookie = "endDate="+$('#end_date').val()+"; expires="+tomorrow;

//********************************************************************
//HTTP request for mote details using get_details.php
  var detailReq = new XMLHttpRequest();
  
  detailReq.onload = function() {
    motedetail =JSON.parse(this.responseText);
    detailContent = "<table><tbody><tr><th>mote id "+mote+"</th><th>MinVal</th><th>MaxVal</th></tr>";
    // Loop through the array to create the table rows in HTML
    for (var i=0;i<motedetail.length;i++) {
      var sensor = motedetail[i];
      detailContent += "<tr><td>"+sensor.sensor+"</td><td>"+sensor.MinVal+"</td><td>"+sensor.MaxVal+"</td></tr>";
    }
    var start = startDate.toDateString();
    var end = endDate.toDateString();
    detailContent += "<tr><th colspan='3'>startDate</th></tr><tr><td colspan='3 style='padding: 5px;'>"+start+"</td></tr><tr><th colspan='3'>End Date</th></tr><tr><td colspan='3' style='padding: 5px;'>"+end+"</td></tr></tbody></table>";
  
  };

  detailReq.open("get", "php/get_detail.php", true);
  detailReq.send();

//*********************************************************************
//HTTP request for mote data
  var dataReq = new XMLHttpRequest();
  
  dataReq.onload = function() {
    moteArray =JSON.parse(this.responseText);
  //Check if data obj was retreived
  if(typeof(moteArray) ==='object') {

//************Get the desc of the mote id location and assign it to the Graph Title
  for(var i=0;i<motes.length;i++) {
    if(motes[i].mote === mote) {
      title = motes[i].location;
    }
  };

  if(title) {
    title += " (mote id "+mote+")";
  } else { title = "(mote id "+mote+")";};

//******************************************************************************************************************************
// Create object with properties named after each sensor with a value of an array of length equal to days in user input
  graphArrays = {}; // reset needed for each new graph.

  for(var i=0;i<motedetail.length;i++) {
    if(motedetail[i].MaxVal>1) { // If value is greater then 1 then we work out an average by having sum and avg array also
      graphArrays[motedetail[i].sensor] = new Array(diffDays).fill(0);
      graphArrays[motedetail[i].sensor+'Sum'] = new Array(diffDays).fill(0);
      graphArrays[motedetail[i].sensor+'Avg'] = new Array(diffDays).fill(0);
    }
    else { graphArrays[motedetail[i].sensor+'Count'] = new Array(diffDays).fill(0); } // if value is not greater then one we use this sensor as a counter only (An event reading)
  }

//Loop through every object in the array to get a count per sensor per day
  moteArray.forEach(function(obj) {
    var d=new Date(startDate); // set startDates date obj as d for loop below
    for(var j=0; j<diffDays; j++) { // ************** loop every day ****************
      for(var x=0;x<motedetail.length;x++) { //loop each sensor name from the motedetail object
        if(new Date(obj.date_time).getDate() ===d.getDate() && obj.sensor_type===motedetail[x].sensor && obj.observation==="1") {
          graphArrays[obj.sensor_type+'Count'][j]++; //increment the day count array for the current sensor property. ie. Pir on 2nd day => obj {Pir: [0,1,0,0], Mag...:[0,0,0,0], ....}
        } else if(new Date(obj.date_time).getDate() ===d.getDate() && obj.sensor_type===motedetail[x].sensor && obj.observation!=="0") {
          graphArrays[obj.sensor_type][j]++;
          graphArrays[obj.sensor_type+'Sum'][j] += parseInt(obj.observation);
          parseFloat(graphArrays[obj.sensor_type+'Sum'][j].toFixed(2)); //Convert Sum arrays to float(2) 
        }   
      }
      d.setTime(d.getTime()+oneDay); // increment the date by one day
    };
  });

//*********** Calc the avg per day
  for(var i=0;i<diffDays;i++) { //diffDays is equal to the length of graphArrays
    for(var x=0;x<motedetail.length;x++) {//loop through each sensor
      if(graphArrays[motedetail[x].sensor+'Sum']) { //Check if this sensor has a sum array
        avg = parseInt(graphArrays[motedetail[x].sensor+'Sum'][i]/graphArrays[motedetail[x].sensor][i]);
        if(!isNaN(avg)) {
          graphArrays[motedetail[x].sensor+'Avg'][i] = avg;
        } else { graphArrays[motedetail[x].sensor+'Avg'][i] = 0 }
      }
    }
  };

}// end of if object statment
else { 
  alert(moteArray);
  $("input[type=text], textarea").val("");
    //Hide the draw graph button
    $("#draw").toggle();
    //Hide the reset button
    $("#reset").toggle();
    //show the get details button
    $("#details").toggle();
}


  }; // End of dataReq.onload function

  dataReq.open("get", "php/get_data.php", true);
  dataReq.send();
  //*********************************************************************
  $('#details').toggle(); // hide the get details button
  $('#draw').toggle(); // show the draw graph button
  $("#reset").toggle(); //show the reset button  
  } // end of if statment to check date and mote from user inputs.
  else {
    alert("Please check you have entered a mote_id and start/end dates as 'yyyy-mm-dd' with the option of time as 'yyyy-mm-dd hh:mm'. Date Range must beless then two months!!");
  }
}; // end of get data function

//*************************************************************************************************************************
//*************************************************************************************************************************
//Set up arrays with sensor data to populate the google chart
function submit() {//called when the user hits the button "Draw Graoh"
Pace.restart();

//*************************************************************************************************************************
// Load the Visualization API and the corechart package. Details on https://google-developers.appspot.com/chart/interactive/docs/basic_load_libs
  google.charts.load('current', {'packages':['corechart','controls']});
  // Set a callback to run when the Google Visualization API is loaded.
  google.charts.setOnLoadCallback(drawChart);
  // Callback that creates and populates a data table, instantiates the chart, passes in the data and draws it.
  function drawChart() {
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    for(var sensors in graphArrays) {
      if(sensors.includes('Avg') | sensors.includes('Count')) {
        data.addColumn('number', sensors);
      }
    };
    //reset startDate object from input
    startDate = new Date($('#start_date').val());

    for(i=0;i<diffDays;i++) {//loop each sensor array item

      var row = [new Date(startDate)]; // First col been the date

      for(sensor in graphArrays) { // Loop each sensor value to add to chart col
        if(sensor.includes('Avg') | sensor.includes('Count')) { //Ignore sum and counter for avg
          row.push(graphArrays[sensor][i]);
        }
      }
      data.addRow(row);
      startDate.setTime(startDate.getTime()+oneDay); // increment the startDate object by mil sec so month change is made
    };  
    //************************** column selector *****************************************************************************************
    var columnsTable = new google.visualization.DataTable();
    columnsTable.addColumn('number', 'colIndex');
    columnsTable.addColumn('string', 'colLabel');
    var initState= {selectedValues: []};
    // put the columns into this data table (skip column 0)
    for (var i = 1; i < data.getNumberOfColumns(); i++) {
        columnsTable.addRow([i, data.getColumnLabel(i)]);
        // you can comment out this next line if you want to have a default selection other than the whole list
        initState.selectedValues.push(data.getColumnLabel(i));
    }
    // you can set individual columns to be the default columns (instead of populating via the loop above) like this:
    // initState.selectedValues.push(data.getColumnLabel(4));
    var columnFilter = new google.visualization.ControlWrapper({
        controlType: 'CategoryFilter',
        containerId: 'colFilter_div'+graphCount, // sets new div for each graph
        dataTable: columnsTable,
        options: {
            filterColumnLabel: 'colLabel',
            ui: {
                label: '',
                caption: "Select Sensors",
                allowTyping: false,
                allowMultiple: true,
                allowNone: false,
                selectedValuesLayout: 'aside'
            }
        },
        state: initState
    });

    var chart = new google.visualization.ChartWrapper({
        chartType: chartType,
        containerId: 'chart_div'+graphCount,
        dataTable: data,
        options: {
            title: title, // Title variable set at start of submit func
            width: '100%',
            height: 200,
            pointSize: 3,
            hAxis: {
                title: 'Date(Month/date/year)',
                format: 'MMM/d/yy EEE' //show date format as ex Sep/4/16 Sun
            },
            vAxes: {
                0: {title:'Sensor counter & Avg'}
            },
            explorer: {
                axis: 'horizontal'
            }
        }
    });

    function setChartView () {
        
        var state = columnFilter.getState();
        var row;
        var view = {
            columns: [0]
        };
        for (var i = 0; i < state.selectedValues.length; i++) {
            row = columnsTable.getFilteredRows([{column: 1, value: state.selectedValues[i]}])[0];
            view.columns.push(columnsTable.getValue(row, 0));
        }
        // sort the indices into their original order
        view.columns.sort(function (a, b) {
            return (a - b);
        });
        chart.setView(view);
        chart.draw();
    }
    // clear the selection from the form fields after graph is setup
    $("input[type=text], textarea").val("");
    //Hide the draw graph button
    $("#draw").toggle();
    //Hide the reset button
    $("#reset").toggle();
    //show the get details button
    $("#details").toggle();
    //create new Divs to hold the graph filter and chart
    var newDom = "<div id='"+graphCount+"' class='row chart'><div id='contentDetail"+graphCount+"' class='col-md-3'></div>";
    newDom += "<div class='col-sm-7 col-md-8'><span class='glyphicon glyphicon-remove' style='float: right;' onclick='removeDiv("+graphCount+")'></span>";
    newDom += "<div id='colFilter_div"+graphCount+"'></div><div id='chart_div"+graphCount+"'></div></div></div>";
    //add the Dom to the index page by added it to the graph container div.
    $('.graphContainer:last').append(newDom);
    $('#contentDetail'+graphCount).html(detailContent);
    graphCount++; // increment the counter for the next graph
 
    google.visualization.events.addListener(columnFilter, 'statechange', setChartView);
  
    
    setChartView(); //draw chart
    columnFilter.draw(); // draw the column filter
  } // end of DrawChart func

}; // End of Submit function

