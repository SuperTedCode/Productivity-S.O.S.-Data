//Global variables
var sensorData = [];
var floors=[]; //holds and obj array of the devices details
var modules =0; // Sets the span length on the devices tables for the floor header
var token; //users access token. used in both REST APIs
var maxSt = new Date().getTime(); //Sets the data range in which the user can request data.
var maxEd =0;
var urlArray =[];//array to hold the urls needed to download sensor data
var xhr =[]; //AJAX array for each device API
var urlKeys =[];
var count=0;//step through each urlkey
//*************  http://api.jqueryui.com/datepicker ************************
// API for the date input fields used for the SQL query, Format set for mySQL.
$.datepicker.setDefaults({
  dateFormat: "yy-mm-dd"
});
//Invoke the calender API
$(function() {
  $("#start_date").datepicker();
  $("#end_date").datepicker();
});
//Get device data from netatmo via users access token***********************
function fetchNetatmoDevices() {
    var getstationsdata = "https://api.netatmo.com/api/getstationsdata?get_favorites=true&access_token=";
    token = $('#token').val();
    getstationsdata += token;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        //4:request finished and response is ready / 200: "OK"
        if (request.readyState == 4 && request.status == 200) {
            callback(request.responseText);
        } else if(request.readyState == 4 && request.status == 403) {
            alert(request.status+request.responseText);//alerts if access token failed
        }
    };
    request.open('GET', getstationsdata, true);
    request.send();
};
//wrapper to structure the JSON data returned from netatmo for Productivity SOS Data website
var callback = function(response) {
    Pace.restart();
    var netatmoDevices =JSON.parse(response);
    floors = []; //reset incase user changes access token and runs func again
    for(var i=0;i<netatmoDevices.body.devices.length;i++) {
        var floorDevice = {
            "Device_id" : netatmoDevices.body.devices[i]._id,
            "DevicePK" : (i+1).toString(),//Only strings to pass to PHP
            "Floor" : netatmoDevices.body.devices[i].station_name,
            "Location" : netatmoDevices.body.devices[i].module_name,
            "Sensors" : netatmoDevices.body.devices[i].data_type,
            "date_setup" : netatmoDevices.body.devices[i].date_setup.toString(),
            "last_store" : netatmoDevices.body.devices[i].last_status_store.toString()
        } //Loop added incase mote then one module per device
        for(var j=0;j<netatmoDevices.body.devices[i].modules.length;j++) {
            floorDevice["Module_id"+j] = netatmoDevices.body.devices[i].modules[j]._id;
            floorDevice["Module_PK"]= (((i+1)*10)+j).toString();
            floorDevice["Module_Location"+j] = netatmoDevices.body.devices[i].modules[j].module_name;
            floorDevice["Module_Sensors"+j] = netatmoDevices.body.devices[i].modules[j].data_type;
        };
        floors.push(floorDevice); //Push each device to floors
        //following if statment used to set col span in device list table*********
        if(netatmoDevices.body.devices[i].modules.length > modules) {
            modules = netatmoDevices.body.devices[i].modules.length;
        };
    };
    populateTable(floors);

    var json = jsObj2phpObj(floors);//convert obj to JSON
    $.post("php/insertDevices.php",{json:json}, function(data) {
        console.log(data); //Dev ref to print php echos
    });
    
};
//Populate Device details to index.html*******************
function populateTable(data) {
    $('#dateRange').empty(); // reset for reruns
    $('#device_table').empty();
    var table = "<p>The following devices were found for this token id. Select a date range to preceed to the charts webpage or select a new access Token</p><table class='table'><tbody>";
    for(var i=0; i<data.length;i++) {
        var st = new Date(data[i].date_setup*1000);
        var ed = new Date(data[i].last_store*1000);
        var start = st.toUTCString();
        var end = ed.toUTCString();
        table+="<tr><th colspan='"+(modules+1)+"'>"+data[i].Floor+"</th></tr><tr><td>Setup: "+start+"</td><td>Last Data: "+end+"</td></tr><tr><td>Device id:"+data[i].DevicePK+" - "+data[i].Location+"</td>";
        for(var j=0;j<modules;j++) {
            table+="<td>Module id:"+data[i].Module_PK+" - "+data[i]["Module_Location"+j]+"</td>";
        }
        table+="</tr>";
        if(st.getTime() < maxSt) {
            maxSt = st;
        }
        if(ed.getTime() > maxEd) {
            maxEd = ed;
        }
    };
    table+="</tbody></table>";
    var dateRange = "<p><b>Sensor data available from "+maxSt.getDate()+"/"+(maxSt.getMonth()+1)+"/"+maxSt.getFullYear()+" to "+maxEd.getDate()+"/"+(maxEd.getMonth()+1)+"/"+maxEd.getFullYear()+"</b></p>";
    $('#dateRange').append(dateRange);
    $('#device_table').append(table);
    $('#dates').show();
    $('#goCharts').show();
};
//Convert Devices data object to PHP object *************
function jsObj2phpObj(object) {
    var json = "{";
    for(property in object) {
        var value = object[property];
        if(typeof(value) == "string") {
            json += '"'+property+'":"'+value+'",';
        } else {
            if(!value[0]) { //if its an associative array
                json += '"'+property+'":'+jsObj2phpObj(value)+',';
            } else {
                json += '"'+property+'":[';
                for(prop in value) json += '"'+value[prop]+'",';
                json = json.substr(0,json.length-1) + "],";
            }
        }
    }
    return json.substr(0,json.length-1) + "}";
};

//****************************************************************************************

//Get sensors data from netatmo in date range entered by user*****************************
function fetchNetatmoValues() {
    count=0;
    $('#deviceRecords').empty() //Clear the insert records when users hits sensor download button. 
    var st = new Date($('#start_date').val());
    var ed = new Date($('#end_date').val());
    var scale = $('#scale').val();
    var scaleDays = 0;
    switch(scale) { // Set the date range to the scale value choosen by the user.
        case "30min":
            scaleDays = 20;
            break;
        case "1hour":
            scaleDays = 40;
            break;
        case "3hours":
            scaleDays = 124;
            break;
        case "1day":
            scaleDays = 1095;
    };
    var oneDay = 24*60*60*1000;
    var numDays = Math.round(Math.abs((st.getTime() - ed.getTime())/oneDay));
    //Reset decleared variables for user reruns!!
    var deviceURL = "";
    var moduleURL = "";
    var moteId = "";
    urlArray = [];
    var urlObj = {};
    if(st > maxSt && ed < maxEd && numDays > 2 && scaleDays > numDays && !isNaN(st.getDate()) && !isNaN(ed.getDate())) {
        st = st.getTime()/1000;
        ed = ed.getTime()/1000;
        var getmeasure = "https://api.netatmo.com/api/getmeasure?access_token="+token+"&scale="+scale+"&date_begin="+st+"&date_end="+ed;
        for( var i=0;i<floors.length;i++) {
            deviceURL = "&device_id="+floors[i].Device_id+"&type="+floors[i].Sensors;
            moteId = floors[i].DevicePK;
            urlObj[moteId] = (getmeasure+deviceURL);
                        
            moduleURL = "&device_id="+floors[i].Device_id+"&module_id="+floors[i].Module_id0+"&type="+floors[i].Module_Sensors0;
            moteId = floors[i].Module_PK;
            urlObj[moteId] = (getmeasure+moduleURL);
        }
        urlArray.push(urlObj);
        xhr =[];

        var obj = urlArray[0];
        urlKeys = Object.keys(obj);
        for(var i=0;i<urlKeys.length;i++) {
            var url = urlArray[0][urlKeys[i]];
            xhr[i] = new XMLHttpRequest();
            xhr[i].open('GET', url, true);
        }
        xhr[0].send();
        //run the first xhr request.
        xhr[0].onreadystatechange = function() {
        //4:request finished and response is ready / 200: "OK"
            if (xhr[0].readyState == 4 && xhr[0].status == 200) {
                sensorDataWrapper(xhr[0].responseText, urlKeys);
            } else if(xhr[0].readyState == 4 && xhr[0].status == 403) {
                alert(xhr[0].status+xhr[0].responseText);//alerts if access token failed
            }
        };
    } else {
        alert("Please enter a date range within the Scale limit and ensure the start and end dates are within the min(setup) and max(last Data) range of the Devices!!!\nScale is currently set at "+scaleDays+" days\nCurrent date range is "+numDays+" days");
    }
    //Setup localstorage for charts page default display
    localStorage.setItem("startDate",$('#start_date').val());
    localStorage.setItem("endDate",$('#end_date').val());
};

// loop each xhr request
function ajaxLoop(x) {
    xhr[x].onreadystatechange = function() {
    //4:request finished and response is ready / 200: "OK"
    if (xhr[x].readyState == 4 && xhr[x].status == 200) {
        sensorDataWrapper(xhr[x].responseText, urlKeys);
    } else if(xhr[x].readyState == 4 && xhr[x].status == 403) {
            alert(xhr[x].status+xhr[x].responseText);//alerts if access token failed
        }
    };
};


function sensorDataWrapper(response,deviceKeys) {
    Pace.restart();
    var netatmoData=JSON.parse(response);
    if(netatmoData.body[0] != undefined) {
        var step_time = netatmoData.body[0].step_time;
        var instance;
        sensorData = []; // reset sensorData for the next xhr request.
        if(netatmoData.body[0].value[0].length > 4) {
            for(var j=0;j<netatmoData.body.length;j++) {
                for(var i=0;i<netatmoData.body[j].value.length;i++) {
                   if(i==0) {
                        instance = {
                            "dateTime" : new Date((netatmoData.body[j].beg_time)*1000).toISOString().slice(0, 19).replace('T', ' '),
                            "temperature" : netatmoData.body[j].value[i][0].toString(),
                            "co2" : netatmoData.body[j].value[i][1].toString(),
                            "humidity" : netatmoData.body[j].value[i][2].toString(),
                            "noise" : netatmoData.body[j].value[i][3].toString(),
                            "pressure" : netatmoData.body[j].value[i][4].toString()
                        }
                        sensorData.push(instance);
                    }
                    else {
                        instance = {
                            "dateTime" : new Date(((netatmoData.body[j].beg_time) + (step_time * i) )*1000).toISOString().slice(0, 19).replace('T', ' '),
                            "temperature" : netatmoData.body[j].value[i][0].toString(),
                            "co2" : netatmoData.body[j].value[i][1].toString(),
                            "humidity" : netatmoData.body[j].value[i][2].toString(),
                            "noise" : netatmoData.body[j].value[i][3].toString(),
                            "pressure" : netatmoData.body[j].value[i][4].toString()
                        }
                        sensorData.push(instance);
                    };
                }
            }
        } else {
            for(var j=0;j<netatmoData.body.length;j++) {
                for(var i=0;i<netatmoData.body[j].value.length;i++) {
                   if(i==0) {
                        instance = {
                            "dateTime" : new Date((netatmoData.body[j].beg_time)*1000).toISOString().slice(0, 19).replace('T', ' '),
                            "temperature" : netatmoData.body[j].value[i][0].toString(),
                            "humidity" : netatmoData.body[j].value[i][1].toString()
                        }
                        sensorData.push(instance);
                    }
                    else {
                        instance = {
                            "dateTime" : new Date(((netatmoData.body[j].beg_time) + (step_time * i) )*1000).toISOString().slice(0, 19).replace('T', ' '),
                            "temperature" : netatmoData.body[j].value[i][0].toString(),
                            "humidity" : netatmoData.body[j].value[i][1].toString()
                        }
                        sensorData.push(instance);
                    };
                }
            }
        }
        
        var json = jsObj2phpObj(sensorData);//convert obj to JSON
        document.cookie = "device="+deviceKeys[count];
        $.post("php/insertSensorData.php",{json:json}, function(data) {
            $('#deviceRecords').append(data);
            count++
            if(count<xhr.length) {
                xhr[count].send();
                ajaxLoop(count);
            } else { // reset after all ajax requests have been processed so user can resend.
                count=0;
                if(!$("#chartsPage").is(":visible")) {
                    $("#chartsPage").toggle();
                }
            }
        });
    } else {
        alert("Netatmo failed to return data for id:"+deviceKeys[count]);
        $('#deviceRecords').append("<p style='color:red;'>Netatmo failed to return data for device/module id "+deviceKeys[count]+"</p>");
        count++
        if(count<xhr.length) {
            xhr[count].send();
            ajaxLoop(count);
        } else {
            count =0;
            $("#chartsPage").toggle();
        }
    }
};
