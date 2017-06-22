<?php
// This script performs a select query to the insight table.

//connect to the database - hint: require       
require ('insightDBaccess.php'); // Connect to the db.

$detailArray =[];

$unit = "SELECT DISTINCT name, measurement_unit from modality;";
$q2 = "SELECT id, location FROM mote;";

$r1 = @mysqli_query ($dbc, $unit);
$r2 = @mysqli_query ($dbc, $q2);

//add in the results for all the sensors and there units.

if ($r1) { // If it ran OK, display the records.
    foreach ($r1 as $row) {
        $detailArray[] = [
        'name' => $row['name'],
        'unit' => $row['measurement_unit']
        ];
    }
};
//adding in the results for mote id and location
if ($r2) {
    foreach ($r2 as $row) {
        $moteLoc = [
        'mote' => $row['id'],
        'location' => $row['location']
        ];
        array_push($detailArray,$moteLoc);
    }
}


echo json_encode($detailArray);
mysqli_free_result ($r1); // Free up the resources.
mysqli_free_result ($r2);
mysqli_close($dbc);

//quit the script - exit();
    exit();
?>



