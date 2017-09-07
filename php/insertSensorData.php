<?php
//connect to the database - hint: require       
//require ('insightDBaccess.php'); // Connect to the db.

$sensors = jsonString2Obj($_POST['json']);
$device = $_COOKIE["device"];
$deviceName = $_COOKIE["deviceName"];

function jsonString2Obj($str) {
    return json_decode(stripslashes($str));
};


//connect to the database - hint: require       
require ('insightDBaccess.php'); // Connect to the db as $dbc
if($device == 1) {//empties table on first run which is xhr[0] and device = 1
	//empty the sensor_data table for new data to avoid duplicates***************************************
	$empty = "TRUNCATE TABLE sensor_data;";
	$r = @mysqli_query ($dbc, $empty);

	if($r) {
	    echo "<b>Messurement Table (sensor_data) wiped!!</b>\n";
	} else {
	    echo "Error: " . $r . "\n" . $dbc->error;
	}
};

//populate the sensor values into the sensor_data table
$sensorSQL = "insert into sensor_data (date_time,mote_id,modality,value) values";

foreach ($sensors as $key) {
	if(isset($key->co2)) {
		$sensorSQL .= "('" . $key->dateTime . "','" . $device . "','CO2','" . $key->co2 ."'),";
	}
	if (isset($key->noise)) {
		$sensorSQL .= "('" . $key->dateTime . "','" . $device . "','Noise','" . $key->noise ."'),";
	}
	if(isset($key->pressure)) {
		$sensorSQL .= "('" . $key->dateTime . "','" . $device . "','Pressure','" . $key->pressure ."'),";
	}
	$sensorSQL .= "('" . $key->dateTime . "','" . $device . "','Temperature','" . $key->temperature ."'),";
	$sensorSQL .= "('" . $key->dateTime . "','" . $device . "','Hudmidity','" . $key->humidity ."'),";
}

$query=rtrim($sensorSQL,", "); // remove the last , from the string
$query .= ';';

if($device>9) {
	$r1 = @mysqli_query ($dbc, $query);
	if($r1) {
	    echo "<p>Sensor values inserted for ".$deviceName."</p>";
	} else {
	    echo "Error: " . $r1 . "\n" . $dbc->error;
	}
} else {
	$r1 = @mysqli_query ($dbc, $query);
	if($r1) {
	    echo "<p>Sensor values inserted for ".$deviceName."</p>";
	} else {
	    echo "Error: " . $r1 . "\n" . $dbc->error;
	}
}


mysqli_close($dbc);
//quit the script - exit();
    exit();
?>
