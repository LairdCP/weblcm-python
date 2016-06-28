<?php
# Copyright (c) 2016, Laird
# Contact: ews-support@lairdtech.com

	require("../lrd_php_sdk.php");
	if(!extension_loaded('lrd_php_sdk')){
		syslog(LOG_WARNING, "ERROR: failed to load lrd_php_sdk");
	}
	header("Content-Type: application/json");
	$interface = json_decode(stripslashes(file_get_contents("php://input")));

	$returnedResult = [
		'SDCERR' => SDCERR_FAIL,
	];

	exec("/usr/sbin/ifrc " . escapeshellcmd($interface->{'interface'}) . " " . escapeshellcmd($interface->{'action'}), $output, $result);

	$returnedResult['SDCERR'] = $result;

	echo json_encode($returnedResult);

?>