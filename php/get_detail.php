<?php
// This script performs a select query to the insight table.

//connect to the database - hint: require		
require ('insightDBaccess.php'); // Connect to the db.

$mid=$_COOKIE["mote"];
$sd=$_COOKIE["startDate"];
$ed=$_COOKIE["endDate"];
$detailArray =[];


$q2 = "SELECT DISTINCT modality, Min(value) as minVal, max(value) as maxVal FROM sensor_data where mote_id = '$mid' and date_time BETWEEN '$sd' and '$ed' GROUP by modality";
$r2 = @mysqli_query ($dbc, $q2);


if (mysqli_num_rows($r2)) { // If it ran OK, display the records.
    foreach ($r2 as $row) {
        $detailArray[] = [
        'sensor' => $row['modality'],
        'MinVal' => $row['minVal'],
        'MaxVal' => $row['maxVal']
        ];
    }
}
else {
    $detailArray[] = ['sensor'=>'No','MinVal'=>'Data','MaxVal'=>'Available'];
}
echo json_encode($detailArray);
mysqli_free_result ($r2); // Free up the resources.
mysqli_close($dbc);

//quit the script - exit();
	exit();
?>