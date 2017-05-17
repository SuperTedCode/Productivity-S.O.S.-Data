<?php
// This script performs a select query to the insight table.

//connect to the database - hint: require		
require ('insightDBaccess.php'); // Connect to the db.

$mid=$_COOKIE["mote"];
$sd=$_COOKIE["startDate"];
$ed=$_COOKIE["endDate"];
$objArray =[];


$q = "select date_time, modality, value from sensor_data where mote_id = '$mid' and date_time BETWEEN '$sd' and '$ed';";
$r = @mysqli_query ($dbc, $q); // Run the query. Note: $dbc is set in the insightDBaccess.php script.

// Count the number of returned rows:
$num = mysqli_num_rows($r);
if ($num > 0) { // If it ran OK, display the records.

// Fetch and print all the records:
	foreach ($r as $row) {
    $objArray[] = [ 
        'date_time' => $row['date_time'],
        'sensor_type' => $row['modality'],
        'observation' => $row['value']
        ];

    }
	echo json_encode($objArray);
} else {
    echo json_encode("No data between dates ".$sd." and ".$ed." for mote_id ".+$mid);
} 
mysqli_free_result ($r); // Free up the resources.
mysqli_close($dbc);

//quit the script - exit();
	exit();
?>


