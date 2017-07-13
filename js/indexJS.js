//Global variables
var netatmoData = [];
var floors=[];
var modules =0;

//*************  http://api.jqueryui.com/datepicker ***********************8
// API for the date input fields used for the SQL query, Format set for mySQL.
$.datepicker.setDefaults({
  dateFormat: "yy-mm-dd"
});
//Invoke the calender API
$(function() {
  $("#start_date").datepicker();
  $("#end_date").datepicker();
});

function populateTable(data) {
    $('#device_table').empty();
    var table = "<p>The following devices were found for this token id. Select a date range to preceed to the charts webpage or select a new access Token</p><table class='table'><tbody>";
    for(var i=0; i<data.length;i++) {
        var st = new Date(data[i].date_setup*1000);
        var ed = new Date(data[i].last_store*1000);
        st = st.toUTCString();
        ed = ed.toUTCString();
        table+="<tr><th colspan='"+(modules+1)+"'>"+data[i].Floor+"</th></tr><tr><td>Setup: "+st+"</td><td>Last Data: "+ed+"</td></tr><tr><td>"+data[i].Location+"</td>";
        for(var j=0;j<modules;j++) {
            table+="<td>"+data[i]["Module_Location"+j]+"</td>";
        }
        table+="</tr>";
    };
    table+="</tbody></table>";
    $('#device_table').append(table);
    $('#dates').show();
    $('#goCharts').show();
};

var callback = function(response) {
	var netatmoDevices =JSON.parse(response);
    floors = []; //reset incase user changes access token and runs again
    for(var i=0;i<netatmoDevices.body.devices.length;i++) {
        var floorDevice = {
            "Device_id" : netatmoDevices.body.devices[i]._id,
            "DevicePK" : (i+1).toString(),
            "Floor" : netatmoDevices.body.devices[i].station_name,
            "Location" : netatmoDevices.body.devices[i].module_name,
            "Sensors" : netatmoDevices.body.devices[i].data_type,
            "date_setup" : netatmoDevices.body.devices[i].date_setup.toString(), //allow strings to pass to PHP
            "last_store" : netatmoDevices.body.devices[i].last_status_store.toString()
        }
        for(var j=0;j<netatmoDevices.body.devices[i].modules.length;j++) {
            floorDevice["Module_id"+j] = netatmoDevices.body.devices[i].modules[j]._id;
            floorDevice["Module_PK"]= (((i+1)*10)+j).toString();
            floorDevice["Module_Location"+j] = netatmoDevices.body.devices[i].modules[j].module_name;
            floorDevice["Module_Sensors"+j] = netatmoDevices.body.devices[i].modules[j].data_type;
        };
        floors.push(floorDevice);
        if(netatmoDevices.body.devices[i].modules.length > modules) {
            modules = netatmoDevices.body.devices[i].modules.length;
        };
    };
    populateTable(floors);

    var json = jsObj2phpObj(floors);
    $.post("php/insertDevices.php",{json:json}, function(data) {
        console.log(data);
    });
    
};

function fetchNetatmoData() {
    var url = "https://api.netatmo.com/api/getstationsdata?get_favorites=true&access_token=";
	var oneDay = 24*60*60*1000;
	var token = $('#token').val();
	url += token;
    netatmoDevicesObj(url);
};

/*
var stDt = new Date($('#start_date').val());
    var edDt = new Date($('#end_date').val());
    var numDays = Math.round(Math.abs((stDt - edDt)/oneDay));
    // four months of data.
    if(numDays > 125 || isNaN(stDt.getDate()) || isNaN(edDt.getDate()) ) {
        alert("Please enter a valid date range!! The date range cannot be greater then FOUR months due to Netatmo's restriction on volume of data");
    } else {
        url += token;
        netatmoDevicesObj(url);
    }


    ***********************
    var now = new Date();
    var time = now.getTime();
    var expireTime = time + 24*60*60*1000;
    now.setTime(expireTime);
    document.cookie = "devices="+floors+"; expires="+now.toUTCString();
    **********************
*/


var netatmoDevicesObj = function(url) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        //4:request finished and response is ready / 200: "OK"
    	if (request.readyState == 4 && request.status == 200) {
    		callback(request.responseText);
    	} else if(request.readyState == 4 && request.status == 403) {
            alert(request.status+request.responseText);
        }
    };
    request.open('GET', url, true);
    request.send();
};



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




