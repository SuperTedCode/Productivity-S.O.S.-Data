<?php
//connect to the database - hint: require       
//require ('insightDBaccess.php'); // Connect to the db.

$devices = jsonString2Obj($_POST['json']);


function jsonString2Obj($str) {
    return json_decode(stripslashes($str));
};

//echo "devices = " . json_decode($devices);
//connect to the database - hint: require       
require ('insightDBaccess.php'); // Connect to the db as $dbc
//empty the tables for new data to avoid duplicates***************************************
$empty = "TRUNCATE TABLE mote;";
$r = @mysqli_query ($dbc, $empty);

if($r) {
    echo "Devices Table (mote) wiped!!\n";
} else {
    echo "Error: " . $r . "\n" . $dbc->error;
}

//empty the modality table
$empty1 = "TRUNCATE TABLE modality;";
$r1 = @mysqli_query ($dbc, $empty1);

if($r1) {
    echo "Sensor Table (modality) wiped!!\n";
} else {
    echo "Error: " . $r1 . "\n" . $dbc->error;
}

//empty the sensor_data table for new data to avoid duplicates***************************************
$empty2 = "TRUNCATE TABLE sensor_data;";
$r2 = @mysqli_query ($dbc, $empty2);

if($r2) {
    echo "Messurement Table (sensor_data) wiped!!\n";
} else {
    echo "Error: " . $r2 . "\n" . $dbc->error;
}


//Populate the tables Mote and modality ***************************************************
$sqlDevices = 'insert into mote (id, location) values ';
$sqlSensores = 'insert into modality (name,mote_id) values ';

foreach ($devices as $d) {
    $sqlDevices .= '("'.$d->DevicePK.'","'.$d->Floor.' '.$d->Location.'"),';
    foreach ($d->Sensors as $dsensors) {
        $sqlSensores .= '("'.$dsensors.'","'.$d->DevicePK.'"), ';
    }
    $sqlDevices .= '("'.$d->Module_PK.'","'.$d->Floor.' '.$d->Module_Location0.'"), ';
    foreach ($d->Module_Sensors0 as $msensors) {
        $sqlSensores .= '("'.$msensors.'","'.$d->Module_PK.'"), ';
    }
};
$query=rtrim($sqlDevices,", "); // remove the last , from the string
$query .= ';';
$query1=rtrim($sqlSensores,", "); // remove the last , from the string
$query1 .= ';';

if ($dbc->multi_query($query) === TRUE) {
    echo "Devices details have been added to the database\n";
} else {
    echo "Error: " . $query . "\n" . $dbc->error;
}

if ($dbc->multi_query($query1) === TRUE) {
    echo "Sensors have been added to the database\n";
} else {
    echo "Error: " . $query1 . "\n" . $dbc->error;
}
//Update the modality table with the sensor units. As this is standard it will be hardcoded in.
$unitArray =  array('Temperature'=>'Degree Celsius (°C)','CO2'=>'Parts-Per Million (ppm)','Humidity'=>'Water vapor in air (%)','Noise'=>'Decibel (dB)','Pressure'=>'millibars (mbar)','Wind'=>'Kph','Rain'=>'per square meter in one hour (mm)');
$unitSql = "";
foreach ($unitArray as $x => $x_value) {
    $unitSql .= "update modality set measurement_unit ='".$x_value."' where name = '".$x."';\n";
}

if ($dbc->multi_query($unitSql) === TRUE) {
    echo "Units added to modality\n";
} else {
    echo "Error: " . $query . "\n" . $dbc->error;
}


mysqli_close($dbc);
//quit the script - exit();
    exit();
?>
