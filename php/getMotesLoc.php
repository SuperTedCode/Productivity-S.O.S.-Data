<?php
// This script performs a select query to the insight table.

//connect to the database - hint: require       
require ('insightDBaccess.php'); // Connect to the db.

$detailArray =[];

$q2 = "SELECT id, location FROM mote;";
$r2 = @mysqli_query ($dbc, $q2);

//$table = '<table border="1"><tbody><tr><th>Sensor</th><th>MinVal</th><th>MaxVal</th><th>MinDate</th><th>MaxDate</th></tr>';

if ($r2) { // If it ran OK, display the records.
    foreach ($r2 as $row) {
        $detailArray[] = [
        'mote' => $row['id'],
        'location' => $row['location']
        ];
    }
}

echo json_encode($detailArray);
mysqli_free_result ($r2); // Free up the resources.
mysqli_close($dbc);

//quit the script - exit();
    exit();
?>


