<?php
	require("../lrd_php_sdk.php");
	if(!extension_loaded('lrd_php_sdk')){
		syslog(LOG_WARNING, "ERROR: failed to load lrd_php_sdk");
	}
	header("Content-Type: application/json");
	$interface = json_decode(stripslashes(file_get_contents("php://input")));

	$returnedResult = [
		'SDCERR' => SDCERR_FAIL,
	];

	if ($interface->{'auto'} == "no"){
		$result = LRD_ENI_AutoStartOff($interface->{'interfaceName'});
	}elseif($interface->{'auto'} == "yes"){
		$result = LRD_ENI_AutoStartOn($interface->{'interfaceName'});
	}

	if ($result == SDCERR_SUCCESS){
		$result = LRD_ENI_SetMethod($interface->{'interfaceName'},$interface->{'method'});
	}

	if ($result == SDCERR_SUCCESS){
		$result == LRD_ENI_SetAddress($interface->{'interfaceName'},$interface->{'address'});
	}

	if ($result == SDCERR_SUCCESS){
		$result == LRD_ENI_SetNetmask($interface->{'interfaceName'},$interface->{'netmask'});
	}

	if ($result == SDCERR_SUCCESS){
		$result == LRD_ENI_SetGateway($interface->{'interfaceName'},$interface->{'gateway'});
	}

	if ($result == SDCERR_SUCCESS){
		$result == LRD_ENI_SetBroadcastAddress($interface->{'interfaceName'},$interface->{'broadcast'});
	}

	if ($result == SDCERR_SUCCESS){
		$result == LRD_ENI_SetNameserver($interface->{'interfaceName'},$interface->{'nameserver'});
	}

	if ($interface->{'br_port_1'} && $interface->{'br_port_2'}){
		if ($interface->{'br_port_1'} != $interface->{'br_port_2'}){
			$result == LRD_ENI_SetBridgePorts($interface->{'interfaceName'}, $interface->{'br_port_1'} . " " . $interface->{'br_port_2'});
		}else{
			$result = SDCERR_INVALID_PARAMETER;
		}
	}

	$returnedResult['SDCERR'] = $result;

	echo json_encode($returnedResult);

?>
