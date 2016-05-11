<?php
	require("../lrd_php_sdk.php");
	if(!extension_loaded('lrd_php_sdk')){
		syslog(LOG_WARNING, "ERROR: failed to load lrd_php_sdk");
	}
	header("Content-Type: application/json");

	$returnedResult = [
		'SDCERR' => SDCERR_FAIL,
	];

	$rcs = new_RADIOCHIPSETp();
	$result = LRD_WF_GetRadioChipSet($rcs);
	if($result == SDCERR_SUCCESS){
		$supportedGlobals = new SDCGlobalConfig();
		$result = LRD_WF_GetSupportedGlobals(RADIOCHIPSETp_value($rcs), $supportedGlobals);
		if($result == SDCERR_SUCCESS){
			$returnedResult['aLRS'] = $supportedGlobals->aLRS;
			$returnedResult['authServerType'] = $supportedGlobals->authServerType;
			$returnedResult['bLRS'] = $supportedGlobals->bLRS;
			$returnedResult['BeaconMissTimeout'] = $supportedGlobals->BeaconMissTimeout;
			$returnedResult['BTcoexist'] = $supportedGlobals->BTcoexist;
			$returnedResult['CCXfeatures'] = $supportedGlobals->CCXfeatures;
			if ($supportedGlobals->certPath){
				$returnedResult['certPath'] = 1;
			}else{
				$returnedResult['certPath'] = 0;
			}
			$returnedResult['suppInfo'] = $supportedGlobals->suppInfo;
			$returnedResult['defAdhocChannel'] = $supportedGlobals->defAdhocChannel;
			$returnedResult['DFSchannels'] = $supportedGlobals->DFSchannels;
			$returnedResult['fragThreshold'] = $supportedGlobals->fragThreshold;
			$returnedResult['PMKcaching'] = $supportedGlobals->PMKcaching;
			$returnedResult['probeDelay'] = $supportedGlobals->probeDelay;
			$returnedResult['regDomain'] = $supportedGlobals->regDomain;
			$returnedResult['roamPeriodms'] = $supportedGlobals->roamPeriodms;
			$returnedResult['roamTrigger'] = $supportedGlobals->roamTrigger;
			$returnedResult['RTSThreshold'] = $supportedGlobals->RTSThreshold;
			$returnedResult['scanDFSTime'] = $supportedGlobals->scanDFSTime;
			$returnedResult['TTLSInnerMethod'] = $supportedGlobals->TTLSInnerMethod;
			$returnedResult['uAPSD'] = $supportedGlobals->uAPSD;
			$returnedResult['WMEenabled'] = $supportedGlobals->WMEenabled;
		}
	}
	echo json_encode($returnedResult);

	delete_RADIOCHIPSETp($rcs);
?>
