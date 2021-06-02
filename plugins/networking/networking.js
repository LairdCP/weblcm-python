// Copyright (c) 2018, Laird Connectivity
// Contact: support@lairdconnect.com

function networkingAUTORUN(retry){

  $(document).on("click", "#networking_connections_mini_menu, #networking_connections_main_menu", function(){
    clickConnectionsPage();
  });

  $(document).on("click", "#networking_edit_mini_menu, #networking_edit_main_menu", function(){
    clickEditConnectionPage();
  });

  $(document).on("click", "#networking_certs_mini_menu, #networking_certs_main_menu", function(){
    clickCertsPage();
  });

  $(document).on("click", "#networking_scan_mini_menu, #networking_scan_main_menu", function(){
    clickScanPage();
  });

  $(document).on("click", "#bt-connection-activate", function(){
    activateConnection();
  });

  $(document).on("click", "#bt-connection-edit", function(){
    selectedConnection();
  });

  $(document).on("click", "#bt-connection-delete", function(){
    removeConnection();
  });

  $(document).on("change", "#connectionSelect", function(){
    onChangeConnections();
  });

  $(document).on("click", "#goToConnection", function(){
    addScanConnection();
  });

  $(document).on("click", "#bt-manual-scan", function(){
    requestScan();
  });

  $(document).on("click", "#addNewConnection", function(){
    addConnection();
  });

  $(document).on("change", "#interface-name", function(){
    onChangeNetworkInterface();
  });

  $(document).on("change", "#connection-type", function(){
    onChangeConnectionType();
  });

  $(document).on("change", "#ipv4-method", function(){
    onChangeIpv4Method();
  });

  $(document).on("change", "#ipv6-method", function(){
    onChangeIpv6Method();
  });

  $(document).on("change", "#radio-mode", function(){
    onChangeRadioMode();
  });

  $(document).on("change", "#key-mgmt", function(){
    onChangeKeymgmt();
  });

  $(document).on("change", "#eap-method", function(){
    onChangeEap();
  });

  $(document).on("change", "#phase2-auth", function(){
    onChangePhase2NoneEap();
  });

  $(document).on("change", "#phase2-autheap", function(){
    onChangePhase2Eap();
  });

  $(document).on("change", "#phase1-fast-provisioning", function(){
    onChangePhase1FastProvisioning();
  });

  $(document).on("click", "#bt-import-cert", function(){
    fileUpload($("#form-import-cert"), $("#input-file-cert"), $("#bt-import-cert"));
    getFileList('cert', createCertList);
  });

  $(document).on("click", "#bt-import-pac", function(){
    fileUpload($("#form-import-pac"), $("#input-file-pac"), $("#bt-import-pac"));
    getFileList('pac', createPacList);
  });

  $(document).on("click", "#bt-import-cert-2", function(){
    fileUpload($("#form-import-cert-2"), $("#input-file-cert-2"), $("#bt-import-cert-2"));
    getFileList('cert', createCertTable);
  });

  $(document).on("click", "#bt-import-pac-2", function(){
    fileUpload($("#form-import-pac-2"), $("#input-file-pac-2"), $("#bt-import-pac-2"));
    getFileList('pac', createPacTable);
  });

  $(document).on('show.bs.tab', "#nav-tab-cert-pac a", function(){
    if($(this).attr("href") == "#tab-pac"){
      getFileList('pac', createPacTable);
    }
    else{
      getFileList('cert', createCertTable);
    }
  });

  $(document).on("change", "#ipv6-addr-gen-mode", function(){
    onChangeIPv6AddrGenMode();
  });
}

function onChangeIPv6AddrGenMode() {
  let v = $("#ipv6-addr-gen-mode").val();
  //Token must not be set for stable-privacy mode
  if (v == 1)
      $("#ipv6-token").val("");
}

function onChangePhase1FastProvisioning(){
  v = $("#phase1-fast-provisioning").val();
  if(v == "0"){
    $("#form-import-pac").removeClass("d-none");
    $("#pac-file-display").removeClass("d-none");
    $("#pac-file-password-display").removeClass("d-none");
  }
  else{
    $("#form-import-pac").addClass("d-none");
    $("#pac-file-display").addClass("d-none")
    $("#pac-file").val("");
    $("#pac-file-password-display").addClass("d-none")
    $("#pac-file-password").val("");
  }
}

//Set default connection type according to the interface
function onChangeNetworkInterface(){

  let ifrname = $("#interface-name").val();

  if(-1 !== ifrname.indexOf("wlan")){
    $("#connection-type").val("802-11-wireless");
    $("#connection-type").change();
    $('#connection-type').attr('disabled', 'disabled');
  }
  else if(-1 !== ifrname.indexOf("eth")){
    $("#connection-type").val("802-3-ethernet");
    $("#connection-type").change();
    $('#connection-type').attr('disabled', 'disabled');
  }
  else if(-1 !== ifrname.indexOf("br")){
    $("#connection-type").val("bridge");
    $("#connection-type").change();
    $('#connection-type').attr('disabled', 'disabled');
  }
  else {
    $('#connection-type').removeAttr('disabled');
  }
}

function onChangeConnectionType(){

  $("#connection-wired-settings").addClass("d-none");
  $("#connection-advanced-settings").addClass("d-none");
  $("#connection-wifi-settings").addClass("d-none");
  $("#connection-ppp-settings").addClass("d-none");
  $("#connection-gsm-settings").addClass("d-none");
  $("#connection-wifi-p2p-settings").addClass("d-none");
  $("#connection-bridge-settings").addClass("d-none");
  $("#connection-bluetooth-settings").addClass("d-none");

  let ctype = $("#connection-type").val();
  switch(ctype){
    case "802-3-ethernet":
      $("#connection-wired-settings").removeClass("d-none");
      break;
    case "802-11-wireless":
      $("#connection-wifi-settings").removeClass("d-none");
      $("#connection-advanced-settings").removeClass("d-none");
      break;
    case "ppp":
      $("#connection-ppp-settings").removeClass("d-none");
      break;
    case "gsm":
      $("#connection-gsm-settings").removeClass("d-none");
      break;
    case "bluetooth":
      $("#connection-bluetooth-settings").removeClass("d-none");
      break;
    case "wifi-p2p":
      $("#connection-wifi-p2p-settings").removeClass("d-none");
      break;
    case "bridge":
      $("#connection-bridge-settings").removeClass("d-none");
      break;
    default:
      break;
  }

  //If there is no "bridge" device or it is a bridge master, hide "master" and "slave-type"
  let bridge = checkValueInSelectList($("#interface-name option"), "br");
  if(bridge.length && ctype != "bridge"){
    $("#connection-master-display").removeClass("d-none");
    $("#connection-slave-type-display").removeClass("d-none");
  }
  else{
    $("#connection-master-display").addClass("d-none");
    $("#connection-slave-type-display").addClass("d-none");
  }

}

function clear8021xCredsDisplay(){

  $("#eap-method-display").addClass("d-none");
  $("#eap-method").val("peap");

  $("#eap-auth-timeout-display").addClass("d-none");
  $("#eap-auth-timeout").val("0");

  $("#eap-identity-display").addClass("d-none");
  $("#eap-identity").val("");

  $("#eap-password-display").addClass("d-none");
  $("#eap-password").val("");

  $("#eap-anonymous-identity-display").addClass("d-none");
  $("#eap-anonymous-identity").val("");

  $("#form-import-pac").addClass("d-none");
  $("#form-import-pac").val('');

  $("#pac-file-display").addClass("d-none");
  $("#pac-file").val("");

  $("#pac-file-password-display").addClass("d-none");
  $("#pac-file-password").val("");

  $("#phase1-fast-provisioning-display").addClass("d-none");
  $("#phase1-fast-provisioning").val("0");

  $("#form-import-cert").addClass("d-none");
  $("#form-import-cert").val('');

  $("#ca-cert-display").addClass("d-none");
  $("#ca-cert").val("");

  $("#client-cert-display").addClass("d-none");
  $("#client-cert").val("");

  $("#private-key-display").addClass("d-none");
  $("#private-key").val("");

  $("#private-key-password-display").addClass("d-none");
  $("#private-key-password").val("");

  $("#phase2-auth-display").addClass("d-none");
  $("#phase2-auth").val("none");

  $("#phase2-autheap-display").addClass("d-none");
  $("#phase2-autheap").val("none");

  $("#phase2-ca-cert-display").addClass("d-none");
  $("#phase2-ca-cert").val("");

  $("#phase2-client-cert-display").addClass("d-none");
  $("#phase2-client-cert").val("");

  $("#phase2-private-key-display").addClass("d-none");
  $("#phase2-private-key").val("");

  $("#phase2-private-key-password-display").addClass("d-none");
  $("#phase2-private-key-password-display").val("");

  $("#tls-disable-time-checks-display").addClass("d-none");
  $("#tls-disable-time-checks").val("1");
}

function clearWifiSecurityCredsDisplay() {


  $("#proto-version-display").addClass("d-none");
  $("#proto-version").val("");
  $("#group-cipher-display").addClass("d-none");
  $("#group-cipher").val("");
  $("#pairwise-cipher-display").addClass("d-none");
  $("#pairwise-cipher").val("");

  $("#auth-alg-display").addClass("d-none");
  $("#auth-alg").val("open");

  $("#wep-tx-keyidx-display").addClass("d-none");
  $("#wep-tx-keyidx").val("0");

  $("#wep-key-display").addClass("d-none");
  $("#wep-tx-key0").val("");
  $("#wep-tx-key1").val("");
  $("#wep-tx-key2").val("");
  $("#wep-tx-key3").val("");

  $("#psk-display").addClass("d-none");
  $("#psk").val("");

  $("#leap-username-display").addClass("d-none");
  $("#leap-username").val("");

  $("#leap-password-display").addClass("d-none");
  $("#leap-password").val("");
}

function parseSettingData(data, name, dVal){
  if(data && data.hasOwnProperty(name))
    return data[name];
  return dVal;
}

function resetPhase2AuthSetting(wxs, method, disabled) {
  $("#"+disabled).val(parseSettingData(wxs, disabled, "none"));

  var auth = $("#"+method).val();
  if (-1 !== auth.indexOf("tls")) {
    $("#phase2-ca-cert-display").removeClass("d-none");
    $("#phase2-ca-cert").val(parseSettingData(wxs, "phase2-ca-cert", ""));
    $("#phase2-client-cert-display").removeClass("d-none");
    $("#phase2-client-cert").val(parseSettingData(wxs, "phase2-client-cert", ""));
    $("#phase2-private-key-display").removeClass("d-none");
    $("#phase2-private-key").val(parseSettingData(wxs, "phase2-private-key", ""));
    $("#phase2-private-key-password-display").removeClass("d-none");
    $("#phase2-private-key-password").val("");
  }
  else
  {
    $("#phase2-ca-cert-display").addClass("d-none");
    $("#phase2-ca-cert").val("");

    $("#phase2-client-cert-display").addClass("d-none");
    $("#phase2-client-cert").val("");

    $("#phase2-private-key-display").addClass("d-none");
    $("#phase2-private-key").val("");

    $("#phase2-private-key-password-display").addClass("d-none");
    $("#phase2-private-key-password").val("");
  }
}

function onChangePhase2NoneEap() {
  resetPhase2AuthSetting(null, "phase2-auth", "phase2-autheap");
}

function onChangePhase2Eap() {
  resetPhase2AuthSetting(null, "phase2-autheap", "phase2-auth");
}

function resetEapSetting(wxs){

  $("#ca-cert-display").addClass("d-none");
  $("#ca-cert").val('');
  $("#client-cert-display").addClass("d-none");
  $("#client-cert").val('');
  $("#private-key-display").addClass("d-none");
  $("#private-key").val('');
  $("#private-key-password-display").addClass("d-none");
  $("#tls-disable-time-checks-display").addClass("d-none");
  $("#tls-disable-time-checks").val('');
  $("#form-import-cert").addClass("d-none");
  $("#form-import-cert").val('');

  $("#pac-file-display").addClass("d-none");
  $("#pac-file").val('');
  $("#pac-file-password-display").addClass("d-none");
  $("#pac-file-password").val('');
  $("#phase1-fast-provisioning-display").addClass("d-none");
  $("#phase1-fast-provisioning").val('0');
  $("#form-import-pac").addClass("d-none");
  $("#form-import-pac").val('');

  var eap = $("#eap-method").val();
  switch(eap){
    case "fast":
      if(-1 !== g_curr_user_permission.indexOf("networking_certs"))
        $("#form-import-pac").removeClass("d-none");
      $("#pac-file-display").removeClass("d-none");
      $("#pac-file").val(parseSettingData(wxs, "pac-file", ""));
      $("#pac-file-password-display").removeClass("d-none");
      $("#phase1-fast-provisioning-display").removeClass("d-none");
      $("#phase1-fast-provisioning").val(parseSettingData(wxs, "phase1-fast-provisioning", "0"));
      $("#phase1-fast-provisioning").change();
      $("#phase2-auth-display").removeClass("d-none");
      $("#phase2-autheap-display").removeClass("d-none");
      break;
    case "tls":
      if(-1 !== g_curr_user_permission.indexOf("networking_certs"))
        $("#form-import-cert").removeClass("d-none");
      $("#ca-cert-display").removeClass("d-none");
      $("#ca-cert").val(parseSettingData(wxs, "ca-cert", ""));
      $("#client-cert-display").removeClass("d-none");
      $("#client-cert").val(parseSettingData(wxs, "client-cert", ""));
      $("#private-key-display").removeClass("d-none");
      $("#private-key").val(parseSettingData(wxs, "private-key", ""));
      $("#private-key-password-display").removeClass("d-none");
      $("#phase2-auth-display").addClass("d-none");
      $("#phase2-autheap-display").addClass("d-none");
      $("#tls-disable-time-checks-display").removeClass("d-none");
      $("#tls-disable-time-checks").val(parseSettingData(wxs, "tls-disable-time-checks", "1"));
      break;
    case "ttls":
    case "peap":
      if(-1 !== g_curr_user_permission.indexOf("networking_certs"))
        $("#form-import-cert").removeClass("d-none");
      $("#ca-cert-display").removeClass("d-none");
      $("#ca-cert").val(parseSettingData(wxs, "ca-cert", ""));
      $("#client-cert-display").removeClass("d-none");
      $("#client-cert").val(parseSettingData(wxs, "client-cert", ""));
      $("#private-key-display").removeClass("d-none");
      $("#private-key").val(parseSettingData(wxs, "private-key", ""));
      $("#private-key-password-display").removeClass("d-none");
      $("#phase2-auth-display").removeClass("d-none");
      $("#phase2-autheap-display").removeClass("d-none");
      $("#tls-disable-time-checks-display").removeClass("d-none");
      $("#tls-disable-time-checks").val(parseSettingData(wxs, "tls-disable-time-checks", "1"));
      break;
    default:
      break;
  }
}

function onChangeEap() {
  resetEapSetting();
}

function resetWirelessSecuritySettings(wss, wxs){
  clear8021xCredsDisplay();
  clearWifiSecurityCredsDisplay();

  var keymgmt = $("#key-mgmt").val();
  switch (keymgmt){
    case "none":
      break;
   case "static":
      $("#auth-alg-display").removeClass("d-none");
      $("#auth-alg").val(parseSettingData(wss, "auth-alg", "open"));
      $("#wep-tx-keyidx-display").removeClass("d-none");
      $("#wep-tx-keyidx").val(parseSettingData(wss, "wep-tx-keyidx", "0"));
      $("#wep-key-display").removeClass("d-none")
      break;
    case "ieee8021x":
      $("#leap-username-display").removeClass("d-none");
      $("#leap-password-display").removeClass("d-none");
      $("#auth-alg").val("leap");
      $("#leap-username").val(parseSettingData(wss, "leap-username", ""));
      break;
    case "wpa-psk":
      $("#proto-version-display").removeClass("d-none");
      $("#proto-version").val(parseSettingData(wss, "proto", ""));
      $("#group-cipher-display").removeClass("d-none");
      $("#group-cipher").val(parseSettingData(wss, "group", ""));
      $("#pairwise-cipher-display").removeClass("d-none");
      $("#pairwise-cipher").val(parseSettingData(wss, "pairwise", ""));
      $("#psk-display").removeClass("d-none");
      $("#psk").val(parseSettingData(wss, "psk", ""));
      break;
    case "wpa-eap":
      $("#proto-version-display").removeClass("d-none");
      $("#proto-version").val(parseSettingData(wss, "proto", ""));
      $("#group-cipher-display").removeClass("d-none");
      $("#group-cipher").val(parseSettingData(wss, "group", ""));
      $("#pairwise-cipher-display").removeClass("d-none");
      $("#pairwise-cipher").val(parseSettingData(wss, "pairwise", ""));
      $("#eap-method-display").removeClass("d-none");
      $("#eap-method").val(parseSettingData(wxs, "eap", "peap"));
      resetEapSetting(wxs)
      $("#eap-auth-timeout-display").removeClass("d-none");
      $("#eap-auth-timeout").val(parseSettingData(wxs, "auth-timeout", 0).toString());
      $("#eap-identity-display").removeClass("d-none");
      $("#eap-identity").val(parseSettingData(wxs, "identity", "").toString());
      $("#eap-password-display").removeClass("d-none");
      $("#eap-anonymous-identity-display").removeClass("d-none");
      $("#eap-anonymous-identity").val(parseSettingData(wxs, "anonymous-identity", ""));
      $("#phase2-autheap-display").removeClass("d-none");
      autheap = parseSettingData(wxs, "phase2-autheap", "none");
      $("#phase2-autheap").val(autheap.split(" "));
      $("#phase2-auth-display").removeClass("d-none");
      auth = parseSettingData(wxs, "phase2-auth", "none");
      $("#phase2-auth").val(auth.split(" "));
      break;
    default:
      break;
  }

}

function onChangeKeymgmt(){
  resetWirelessSecuritySettings();
}

function wifi_channel_to_freq(channel, band){

  /* A band */
  const a_freq_table = {
    7: 5035,
    8: 5040,
    9: 5045,
    11: 5055,
    12: 5060,
    16: 5080,
    34: 5170,
    36: 5180,
    38: 5190,
    40: 5200,
    42: 5210,
    44: 5220,
    46: 5230,
    48: 5240,
    50: 5250,
    52: 5260,
    56: 5280,
    58: 5290,
    60: 5300,
    64: 5320,
    100: 5500,
    104: 5520,
    108: 5540,
    112: 5560,
    116: 5580,
    120: 5600,
    124: 5620,
    128: 5640,
    132: 5660,
    136: 5680,
    140: 5700,
    144: 5720,
    149: 5745,
    152: 5760,
    153: 5765,
    157: 5785,
    160: 5800,
    161: 5805,
    165: 5825,
    183: 4915,
    184: 4920,
    185: 4925,
    187: 4935,
    188: 4945,
    192: 4960,
    196: 4980,
  };

  /* BG band */
  const bg_freq_table = {
    1: 2412,
    2: 2417,
    3: 2422,
    4: 2427,
    5: 2432,
    6: 2437,
    7: 2442,
    8: 2447,
    9: 2452,
    10: 2457,
    11: 2462,
    12: 2467,
    13: 2472,
    14: 2484,
  };

  if(!band){
    return bg_freq_table[channel] ? bg_freq_table[channel] : ( a_freq_table[channel] ? a_freq_table[channel] : 0);
  }

  if(band == "bg")
    return bg_freq_table[channel] ? bg_freq_table[channel] : 0;

  return a_freq_table[channel] ? a_freq_table[channel] : 0;
}

function wifi_freq_to_channel(freq, band){

  /* A band */
  const a_chan_table = {
    5035: 7,
    5040: 8,
    5045: 9,
    5055: 11,
    5060: 12,
    5080: 16,
    5170: 34,
    5180: 36,
    5190: 38,
    5200: 40,
    5210: 42,
    5220: 44,
    5230: 46,
    5240: 48,
    5250: 50,
    5260: 52,
    5280: 56,
    5290: 58,
    5300: 60,
    5320: 64,
    5500: 100,
    5520: 104,
    5540: 108,
    5560: 112,
    5580: 116,
    5600: 120,
    5620: 124,
    5640: 128,
    5660: 132,
    5680: 136,
    5700: 140,
    5720: 144,
    5745: 149,
    5760: 152,
    5765: 153,
    5785: 157,
    5800: 160,
    5805: 161,
    5825: 165,
    4915: 183,
    4920: 184,
    4925: 185,
    4935: 187,
    4945: 188,
    4960: 192,
    4980: 196,
  };

  /* BG band */
  const bg_chan_table = {
	2412: 1,
	2417: 2,
	2422: 3,
	2427: 4 ,
	2432: 5,
	2437: 6,
	2442: 7,
	2447: 8,
	2452: 9,
	2457: 10,
	2462: 11,
	2467: 12,
	2472: 13,
	2484: 14,
  };

  if(!band){
    if (freq > 4900)
      return a_chan_table[freq] ? a_chan_table[freq] : 0;
    return bg_chan_table[freq] ? bg_chan_table[freq] : 0;
  }

  if (band == "a")
    return a_chan_table[freq] ? a_chan_table[freq] : 0;

  return bg_chan_table[freq] ? bg_chan_table[freq] : 0;
}

function checkValueInSelectList($opts, val){

  let v = [];

  $opts.each( function(){
    if (-1 !== $(this).val().indexOf(val)) {
      v.push($(this).val());
    }
  });
  return v;
}

function newConnection(id, ssid, key_mgmt) {

  $("#connection-uuid").val("");
  $("#connection-id").val(id);

  if(ssid) {
    let dev = checkValueInSelectList($("#interface-name option"), "wlan");
    if(dev.length){
      $("#interface-name").val(dev[0]);
      $("#interface-name").change();
      $("#ssid").val(ssid);
      $("#key-mgmt").val(key_mgmt);
      $("#key-mgmt").change();
    }
  }
}

function getConnectionConnection(settings){

  $("#connection-uuid").val(parseSettingData(settings['connection'], "uuid", ""));
  $("#connection-id").val(parseSettingData(settings['connection'], "id", ""));

  $("#connection-zone").val(parseSettingData(settings['connection'], "zone", ""))
  //Needs to be changed according to interface/connection type
  $("#connection-master").val(parseSettingData(settings['connection'], "master", ""))
  $("#connection-slave-type").val(parseSettingData(settings['connection'], "slave-type", ""))

  $("#interface-name").val(parseSettingData(settings['connection'], "interface-name", ""));

  $("#connection-type").val(parseSettingData(settings['connection'], "type", ""));
  $("#connection-type").change();

  //"autoconnect" is boolean. Use 1 and 0 so we don't need to do conversion in the backend.
  if(parseSettingData(settings['connection'], "autoconnect", true))
    $("#autoconnect").val(1);
  else
    $("#autoconnect").val(0);
}

function getWifiConnection(settings){

  getConnectionConnection(settings);

  $("#ssid").val(parseSettingData(settings['802-11-wireless'], "ssid", ""));
  if(parseSettingData(settings['802-11-wireless'], "hidden", 0))
    $("#hidden").val(1);
  else
    $("#hidden").val(0);

  $("#client-name").val(parseSettingData(settings['802-11-wireless'], "client-name", ""));

  $("#radio-band").val(parseSettingData(settings['802-11-wireless'], "band", "default"));
  $("#radio-channel").val(parseSettingData(settings['802-11-wireless'], "channel", ""));

  //Convert frequency list to channel list
  let freqlist = parseSettingData(settings['802-11-wireless'], "frequency-list", "").split(" ");
  let chanlist = "";
  freqlist.forEach(function (freq) {
    let iFreq = parseInt(freq) | 0;
    if(iFreq)
      chanlist += wifi_freq_to_channel(iFreq).toString() + " ";
  });
  $("#radio-channel-list").val(chanlist.trim());

  $("#frequency-dfs").val(parseSettingData(settings['802-11-wireless'], "frequency-dfs", 1));
  $("#radio-mode").val(parseSettingData(settings['802-11-wireless'], "mode", "infrastructure"));
  $("#radio-mode").change();
  $("#powersave").val(parseSettingData(settings['802-11-wireless'], "powersave", "0"));
  $("#auto-channel-selection").val(parseSettingData(settings['802-11-wireless'], "acs", 0));

  keymgmt = parseSettingData(settings['802-11-wireless-security'], "key-mgmt", "undefined");
  if(keymgmt == "undefined") {
    $("#key-mgmt").val("none");
  }
  else if(keymgmt == "none") {
    $("#key-mgmt").val("static");
  }
  else {
    $("#key-mgmt").val(keymgmt);
  }

  if(keymgmt != "undefined") {
    resetWirelessSecuritySettings(settings['802-11-wireless-security'], settings['802-1x']);
  }

  if(keymgmt == "wpa-eap") {
    resetEapSetting(settings['802-1x']);
    if ( $("#phase2-autheap").val() != "none"){
      resetPhase2AuthSetting(settings['802-1x'], "phase2-autheap", "phase2-auth");
    }
    else {
      resetPhase2AuthSetting(settings['802-1x'], "phase2-auth", "phase2-autheap");
    }
  }
}

function getEthernetConnection(settings) {

  getConnectionConnection(settings);
}

function getBridgeConnection(settings) {

  getConnectionConnection(settings);
}

function getGsmConnection(settings) {

  getConnectionConnection(settings);
  $("#apn").val(parseSettingData(settings['gsm'], "apn", ""));
}

function getIpv4Settings(settings){

  let ipv4 = [];
  let addresses=[];

  $("#ipv4-method").val(parseSettingData(settings['ipv4'], "method", "auto"));
  $.when($("#ipv4-method").change()).done( function() {
    addresses = parseSettingData(settings['ipv4'], "address-data", "");
    for(let i=0; i<addresses.length; i++){
      ipv4.push(addresses[i].address + '/' + addresses[i].prefix.toString());
    }
    $("#ipv4-addresses").val(ipv4.join(','));

    $("#ipv4-gateway").val(parseSettingData(settings['ipv4'], "gateway", ""));
    $("#ipv4-dns").val(parseSettingData(settings['ipv4'], "dns", ""));
  });
}

function getIpv6Settings(settings){

  let ipv6 = [];
  let addresses = [];

  $("#ipv6-method").val(parseSettingData(settings['ipv6'], "method", "auto"));
  $.when($("#ipv6-method").change()).done( function() {
    addresses = parseSettingData(settings['ipv6'], "address-data", "");
    for(let i=0; i<addresses.length; i++){
      ipv6.push(addresses[i].address + '/' + addresses[i].prefix.toString());
    }
    $("#ipv6-addresses").val(ipv6.join(','));

    $("#ipv6-gateway").val(parseSettingData(settings['ipv6'], "gateway", ""));
    $("#ipv6-dns").val(parseSettingData(settings['ipv6'], "dns", ""));
  });
  $("#ipv6-addr-gen-mode").val(parseSettingData(settings['ipv6'], "addr-gen-mode", 1));
  $("#ipv6-token").val(parseSettingData(settings['ipv6'], "token", ""));
}

function updateGetConnectionPage(uuid, id, ssid, key_mgmt){

  if(uuid == null){
    newConnection(id, ssid, key_mgmt);
    return;
  }

  $.ajax({
    url: "connection?uuid="+uuid,
    type: "GET",
    cache: false,
  })
  .done(function( msg ) {
    if($("#connection-settings-accordion").length > 0){
      if (msg.SDCERR == g_defines.SDCERR.SDCERR_SUCCESS){
        switch(msg.connection.connection.type){
          case "802-3-ethernet":
            getEthernetConnection(msg.connection);
            break;
          case "802-11-wireless":
            getWifiConnection(msg.connection);
            break;
          case "bridge":
			getBridgeConnection(msg.connection);
			break;
          case "gsm":
			getGsmConnection(msg.connection);
			break;
          case "ppp":
          case "bluetooth":
          case "wifi-p2p":
          default:
            break;
        }
        getIpv4Settings(msg.connection);
        getIpv6Settings(msg.connection);
      }
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function editConnection(uuid, id, ssid, key_mgmt) {
  $.ajax({
    url: "plugins/networking/html/addConnection.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done(function( data ) {
    $(".active").removeClass("active");
    $("#networking_edit_main_menu").addClass("active");
    $("#networking_edit_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();

    //Hide connection-zone-display if firewalld is not enabled
    if (!g_defines.SETTINGS.firewalld_disabled)
      $("#connection-zone-display").removeClass("d-none");

    if(-1 == g_curr_user_permission.indexOf("networking_ap_activate"))
      $("#radio-mode-display").addClass("d-none");

    $.when(getNetworkInterfaces(), getFileList('pac', createPacList), getFileList('cert', createCertList))
    .done(function() {
      updateGetConnectionPage(uuid, id, ssid, key_mgmt);
    });
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function selectedConnection(){
  var uuid = $("#connectionSelect").val();
  editConnection(uuid, null, null, null);
}

function onChangeConnections(){
  var activated = $("#connectionSelect option:selected").attr("activated");
  if(activated == 1){
    $("#bt-connection-activate").attr("value", g_i18nData['Deactivate Connection']);
  }
  else {
    $("#bt-connection-activate").attr("value", g_i18nData['Activate Connection']);
  }
}

function updateConnectionsPage(){
  $.ajax({
    url: "connections",
    type: "GET",
    cache: false,
  })
  .done(function( msg ) {
    if($("#connectionSelect").length > 0){
      var sel = $("#connectionSelect");
      sel.empty();
      for (var uuid in msg.connections) {
        if ((msg.connections[uuid]["type"] == "ap") && (-1 == g_curr_user_permission.indexOf("networking_ap_activate")))
          continue;
        var activated = msg.connections[uuid]["activated"];
        var name = msg.connections[uuid]["id"] + "(" + uuid + ")";
        var option = "<option value=" + uuid + " activated=" + activated + ">" + name + "</option>";
        sel.append(option);
      }
      onChangeConnections();
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function activateConnection(){
  var data = {
    activate: $("#connectionSelect option:selected").attr("activated") != 1,
    uuid: $("#connectionSelect").val(),
  }
  $.ajax({
    url: "connection",
    type: "PUT",
    data: JSON.stringify(data),
    contentType: "application/json",
  })
  .done(function( msg ) {
    SDCERRtoString(msg.SDCERR);
    updateConnectionsPage();
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function removeConnection(){

  $.ajax({
    url: "connection?uuid="+$("#connectionSelect").val(),
    type: "DELETE",
  })
  .done(function( msg ) {
    SDCERRtoString(msg.SDCERR);
    updateConnectionsPage();
  });
}

function clickConnectionsPage() {
  $.ajax({
    url: "plugins/networking/html/connections.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done( function( data ){
    $(".active").removeClass("active");
    $("#networking_connections_main_menu").addClass("active");
    $("#networking_connections_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();

    updateConnectionsPage();

    if ((-1 !== g_curr_user_permission.indexOf("networking_activate")) || (-1 !== g_curr_user_permission.indexOf("networking_ap_activate"))){
      $("#bt-connection-activate").prop("disabled", false);
    }
    if (-1 !== g_curr_user_permission.indexOf("networking_edit")){
      $("#bt-connection-edit").prop("disabled", false);
    }
    if (-1 !== g_curr_user_permission.indexOf("networking_delete")){
      $("#bt-connection-delete").prop("disabled", false);
    }

  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function clickEditConnectionPage(){
  editConnection(null, null, null, "none")
}

function validate_wireless_channel(val, $sel, band){

  if(val.length > 0){

    let chan = parseInt(val) | 0;
    if(!chan || !wifi_channel_to_freq(chan, band)){
      $sel.css('border-color', 'red');
      $sel.focus();
      return false;
    }

  }

  $sel.css('border-color', '');
  return true
}

function get_wireless_channel_list(val, $sel, band){
  let strlist = "";

  if(val.length > 0){
    let chlist = val.split(" ");

    for(let i=0; i < chlist.length; i++){

      let freq = wifi_channel_to_freq(parseInt(chlist[i]) | 0);
      if(!freq){
        $sel.css('border-color', 'red');
        $sel.focus();
        return "";
      }

      strlist += freq.toString() + " ";
    }
  }

  return strlist.trim();
}

function validate_number_input(val, $sel){

  if(val.length > 0){

    if(!/\d+$/.test(val)){
      $sel.css('border-color', 'red');
      $sel.focus();
      return false;
    }
  }
  $sel.css('border-color', '');
  return true;
}

function validate_string_input(val, $sel, min, max){

  if (val.length == 0 || (min && val.length < min) || (max && val.length > max)){
    $sel.css('border-color', 'red');
    $sel.focus();
    return false;
  }

  $sel.css('border-color', '');
  return true;
}

function validate_bridge_settings(master, slave, $display){

  //"master" requires "slave-type" to be set, and vice versa
  if(master && !slave){
    $display.css('border-color', 'red');
    return false;
  }

  if(!master && slave){
    $display.css('border-color', 'red');
    return false;
  }

  //Clear error
  $display.css('border-color', '');
  return true;
}

function prepareConnectionConnection(){
  let v;
  let con = {};

  con['uuid'] = $("#connection-uuid").val().trim();
  con['type'] =  $("#connection-type").val().trim();

  if($("#connection-zone").val())
    con['zone'] =  $("#connection-zone").val().trim();

  if($("#connection-master").val())
    con['master'] =  $("#connection-master").val();
  if($("#connection-slave-type").val())
    con['slave-type'] =  $("#connection-slave-type").val();

  if(!validate_bridge_settings($("#connection-master").val(), $("#connection-slave-type").val(), $("#connection-slave-type")))
    return {};

  con['interface-name'] = $("#interface-name").val().trim();
  con['autoconnect'] = parseInt($("#autoconnect").val().trim());
  v = $("#connection-id").val().trim();
  if(!validate_string_input(v, $("#connection-id"))){
    return {};
  }
  con['id'] = v;
  return con;
}

function prepareEthernetConnection() {
  let settings = {};
  con = prepareConnectionConnection();
  if(con)
    settings['connection'] = con;
  return settings;
}

function prepareBridgeConnection() {
  let settings = {};
  con = prepareConnectionConnection();
  if(con)
    settings['connection'] = con;
  return settings;
}

function prepareGsmConnection() {
  let settings = {};
  let gsm = {};

  con = prepareConnectionConnection();
  if(!con)
	return settings;
  settings['connection'] = con;
  gsm['apn'] = $("#apn").val().trim();
  settings['gsm'] = gsm;
  return settings;
}


function prepareWirelessConnection() {


  let con = {};
  let ws = {};
  let wss = {};
  let wxs = {}
  let settings = {};

  function prepareWireless(){

    let v;
    let ws = {};

    v = $("#ssid").val().trim();
    if(!validate_string_input(v, $("#ssid"))){
      return {};
    }
    ws['ssid'] = v;

    v = $("#hidden").val();
    ws['hidden'] = parseInt(v);

    v = $("#radio-mode").val().trim();
    if(v)
      ws['mode'] = v;

    v = $("#client-name").val().trim();
    if(v)
      ws['client-name'] = v;

    //radio-channel-list overrides radio-band and radio-channel
    v = $("#radio-channel-list").val().trim();
    if(v) {
      ws['frequency-list'] = get_wireless_channel_list(v, $("#radio-channel-list"));
	  if(!ws['frequency-list'].length){
        $("##radio-channel-list").css('border-color', 'red');
        $("##radio-channel-list").focus();
        return {};
      }
      $("#radio-channel-list").css('border-color', '');

      //reset band and channel
      $("#radio-band").val("default");
      $("#radio-band").css('border-color', '');
      $("#radio-channel").val("");
      $("#radio-channel").css('border-color', '');
    }
    else {
      v = $("#radio-band").val().trim();
      if(v != "default"){
        ws['band'] = v;
      }
      //"band" should be set to "a" or "bg" to set "radio-channel"
      v = $("#radio-channel").val().trim();
      if(v && !ws['band']){
        $("#radio-band").css('border-color', 'red');
        $("#radio-band").focus();
        return {};
      }
      $("#radio-band").css('border-color', '');
      if(!validate_number_input(v, $("#radio-channel")) || !validate_wireless_channel(v, $("#radio-channel"), ws['band'])){
        return {};
      }
      if(v)
        ws['channel'] = parseInt(v);
    }

    v = $("#frequency-dfs").val().trim();
    if(v)
      ws['frequency-dfs'] = parseInt(v);

    v = parseInt($("#powersave").val());
    if(v)
      ws['powersave'] = v;


    v = $("#auto-channel-selection").val().trim();
    if(v)
      ws['acs'] = parseInt(v);

    return ws;
  }

  function prepareWirelessSecurity(){

    let v;
    let wss = {};
    let keymgmt = $("#key-mgmt").val().trim();

    if(keymgmt == "static") {
      wss['key-mgmt'] = "none";
      wss['auth-alg'] = $("#auth-alg").val().trim();
    }
    else if(keymgmt == "ieee8021x") {
      wss['auth-alg'] = $("#auth-alg").val().trim();
      wss['key-mgmt'] = "ieee8021x";
    }
    else if(keymgmt != "none") {
      wss['key-mgmt'] = keymgmt;

      v = $("#proto-version").val();
      if(v)
        wss['proto'] = v;
      v = $("#group-cipher").val();
      if(v)
        wss['group'] = v;
      v = $("#pairwise-cipher").val();
      if(v)
        wss['pairwise'] = v;
    }

    if(keymgmt == "static") {
      v = parseInt($("#wep-tx-keyidx").val().trim());
      wss['wep-tx-keyidx'] = v;

      v = $("#wep-key0").val().trim();
      if(v)
        wss['wep-key0'] = v;

      v = $("#wep-key1").val().trim();
      if(v)
        wss['wep-key1'] = v;

      v = $("#wep-key2").val().trim();
      if(v)
        wss['wep-key2'] = v;

      v = $("#wep-key3").val().trim();
      if(v)
        wss['wep-key3'] = v;
    }
    else if(keymgmt == "ieee8021x") {
      v = $("#leap-username").val().trim();
      if(!validate_string_input(v, $("#leap-username"))){
        return {};
      }
      wss['leap-username'] = v;

      v = $("#leap-password").val();
      if(v && !validate_string_input(v, $("#leap-password"))){
        return {};
      }
      if(v)
        wss['leap-password'] = v;
      $("#leap-password").css('border-color', '');
    }
    else if (keymgmt == "wpa-psk") {
      v = $("#psk").val();
      if(v && !validate_string_input(v, $("#psk"), 8, 64)){
        return {};
      }
      if(v)
        wss['psk'] = v;
      $("#psk").css('border-color', '');
    }


    return wss
  }

  function prepareWireless8021x(id, ssid){

    let v;
    let wxs = {};

    wxs['eap'] = $("#eap-method").val().trim();

    if($("#tls-disable-time-checks").val())
      wxs['tls-disable-time-checks'] = $("#tls-disable-time-checks").val();

    if (wxs['eap'] == "fast")
      wxs['phase1-fast-provisioning'] = parseInt($("#phase1-fast-provisioning").val()) || 0;

    v = $("#eap-auth-timeout").val().trim();
    if(!validate_number_input(v, $("#eap-auth-timeout"))) {
      return {};
    }
    if(v)
      wxs['auth-timeout'] = parseInt(v);

    v = $("#eap-identity").val().trim();
    if(!validate_string_input(v, $("#eap-identity"))) {
      return {};
    }
    wxs['identity'] = v;

    v = $("#eap-anonymous-identity").val();
    if (v)
      wxs['anonymous-identity'] = v.trim();

    v = $("#eap-password").val();
    if(v)
      wxs['password'] = v;

    v = $("#ca-cert").val();
    if(v)
      wxs['ca-cert'] = v;

    v = $("#client-cert").val();
    if(v)
      wxs['client-cert'] = v;

    v = $("#private-key").val();
    if(v)
      wxs['private-key'] = v;

    v = $("#private-key-password").val();
    if(v)
      wxs['private-key-password'] = v;

    v = $("#phase2-auth").val().join(" ");
    if(v != "none")
      wxs['phase2-auth'] = v;

    v = $("#phase2-autheap").val().join(" ");
    if(v != "none")
      wxs['phase2-autheap'] = v;

    v = $("#phase2-ca-cert").val();
    if(v)
      wxs['phase2-ca-cert'] = v;

    v = $("#phase2-client-cert").val();
    if(v)
      wxs['phase2-client-cert'] = v;

    v = $("#phase2-private-key").val();
    if(v)
      wxs['phase2-private-key'] = v;

    v = $("#phase2-private-key-password").val();
    if(v)
      wxs['phase2-private-key-password'] = v;

    v = $("#pac-file").val();
    if(v)
      wxs['pac-file'] = v;
    else if("phase1-fast-provisioning" in wxs && wxs['phase1-fast-provisioning'])
      wxs['pac-file'] = "/tmp/" + id + '-' + ssid + ".pac";

    v = $("#pac-file-password").val();
    if(v)
      wxs['pac-file-password'] = v;

    return wxs;
  }

  con = prepareConnectionConnection();
  if(!con)
    return con;

  ws = prepareWireless();
  if(!ws)
    return ws;

  wss = prepareWirelessSecurity();
  if(!wss)
    return wss

  if (wss['key-mgmt'] == "wpa-eap") {
    wxs = prepareWireless8021x(con['id'], ws['ssid']);
    if(!wxs)
      return wxs;
  }

  settings['connection'] = con;
  settings['802-11-wireless'] = ws;
  settings['802-11-wireless-security'] = wss;
  settings['802-1x'] = wxs;

  return settings;
}

function prepareIPv4Addresses(){
  let result = {
    'error': true,
    'ipv4':{}
  };

  var ipFormat = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  var prefixFormat = /^(3[0-2]|[0-2]?[0-9])$/;

  result.ipv4['method'] = $("#ipv4-method").val();

  result.ipv4['address-data'] = [];
  if($("#ipv4-addresses").val()){
    let ips = $("#ipv4-addresses").val().split(',');
    for(let i=0; i<ips.length; i++){
      let data = ips[i].split('\/');
      if(data.length != 2 || !data[0].match(ipFormat) || !data[1].match(prefixFormat)){
        $("#ipv4-addresses").css('border-color', 'red');
        $("#ipv4-addresses").focus();
        return result;
      }
      result.ipv4['address-data'].push({'address':data[0], 'prefix':data[1]});
    }
    $("#ipv4-addresses").css('border-color', '');
  }

  if ($("#ipv4-gateway").val()){
    if(!$("#ipv4-gateway").val().match(ipFormat)){
      $("#ipv4-gateway").css('border-color', 'red');
      $("#ipv4-gateway").focus();
      return result;
    }
    result.ipv4['gateway'] = $("#ipv4-gateway").val();
    $("#ipv4-gateway").css('border-color', '');
  }

  result.ipv4['dns'] = [];
  if($("#ipv4-dns").val()){
    let ips = $("#ipv4-dns").val().split(',');
    for(let i=0; i<ips.length; i++){
      if(!ips[i].match(ipFormat)){
        $("#ipv4-dns").css('border-color', 'red');
        $("#ipv4-dns").focus();
        return result;
      }
      result.ipv4['dns'].push(ips[i]);
    }
    $("#ipv4-dns").css('border-color', '');
  }

  result.error = false;
  return result;
}

function prepareIPv6Addresses(){
  let result = {
    'error': true,
    'ipv6':{}
  };

  var ipFormat = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  var prefixFormat = /^(1[01][0-9]|12[0-8]|[0-9]?[0-9])$/;
  var tokenFormat = /^::([0-9a-fA-F]{1,4}:){3}[0-9a-fA-F]{1,4}$/;

  result.ipv6['addr-gen-mode'] = parseInt($("#ipv6-addr-gen-mode").val());

  if(!result.ipv6['addr-gen-mode']) {
    if(!$("#ipv6-token").val().match(tokenFormat)){
      $("#ipv6-token").css('border-color', 'red');
      $("#ipv6-token").focus();
      return result;
    }
    result.ipv6['token'] = $("#ipv6-token").val();
  }
  else if($("#ipv6-token").val().trim()) {
      $("#ipv6-token").css('border-color', 'red');
      $("#ipv6-token").focus();
      return result;
  }
  $("#ipv6-token").css('border-color', '');

  result.ipv6['method'] = $("#ipv6-method").val();
  if(result.ipv6['method'] == "manual" && $("#ipv6-addresses").val()=="")
    return result;

  result.ipv6['address-data'] = [];
  if($("#ipv6-addresses").val()){
    let ips = $("#ipv6-addresses").val().split(',');
    for(let i=0; i<ips.length; i++){
      let data = ips[0].split('\/');
      if(data.length != 2 || !data[0].match(ipFormat) || !data[1].match(prefixFormat)){
        $("#ipv6-addresses").css('border-color', 'red');
        $("#ipv6-addresses").focus();
        return result;
      }
      result.ipv6['address-data'].push({'address':data[0], 'prefix':data[1]});
    }
    $("#ipv6-addresses").css('border-color', '');
  }

  if ($("#ipv6-gateway").val()){
    if(!$("#ipv6-gateway").val().match(ipFormat)){
      $("#ipv6-gateway").css('border-color', 'red');
      $("#ipv6-gateway").focus();
      return result;
    }
    result.ipv6['gateway'] = $("#ipv6-gateway").val();
    $("#ipv6-gateway").css('border-color', '');
  }

  result.ipv6['dns'] = [];
  if($("#ipv6-dns").val()){
    let ips = $("#ipv6-dns").val().split(',');
    for(let i=0; i<ips.length; i++){
      if(ips[i].match(ipFormat)){
        $("#ipv6-dns").css('border-color', 'red');
        $("#ipv6-dns").focus();
        return result;
      }
      result.ipv6['dns'].push(ips[i]);
    }
    $("#ipv6-dns").css('border-color', '');
  }

  result.error = false;
  return result;
}

function addConnection() {

  let ctype = $("#connection-type").val();
  switch(ctype){
    case "802-3-ethernet":
      new_connection = prepareEthernetConnection();
      break;
    case "802-11-wireless":
      new_connection = prepareWirelessConnection();
      break;
    case "bridge":
      new_connection = prepareBridgeConnection();
      break;
    case "gsm":
      new_connection = prepareGsmConnection();
      break;
    case "ppp":
    case "bluetooth":
    case "wifi-p2p":
    default:
      break;
  }

  if (!new_connection){
    customMsg("Invalid Settings", true);
    return;
  }

  let result = prepareIPv4Addresses();
  if(result.error){
    customMsg("Invalid ipv4 Settings", true);
    return;
  }
  new_connection['ipv4'] = result.ipv4;

  result = prepareIPv6Addresses();
  if(result.error){
    customMsg("Invalid ipv6 Settings", true);
    return;
  }
  new_connection['ipv6'] = result.ipv6;

  $.ajax({
    url: "connection",
    type: "POST",
    data: JSON.stringify(new_connection),
    contentType: "application/json",
  })
  .done(function(msg) {
    SDCERRtoString(msg.SDCERR);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function addScanConnection(){
  id = $("#connectionName").val();
  ssid = $("#newSSID").val();
  key_mgmt = $("#security").attr("key-mgmt");
  editConnection(null, id, ssid, key_mgmt);
}

function allowDrop(ev){
  ev.preventDefault();
}

function clickScantableRow(row){
  $("#newSSID").val(row.find("td:eq(0)").text())
  $("#connectionName").val($("#newSSID").val());
  $("#security").val(row.find("td:eq(4)").text());
  $("#security").attr("key-mgmt", row.attr("key-mgmt"));
  $("#connectionNameDisplay").removeClass("has-error");
  $("#goToConnectionDisplay").removeClass("d-none");
}

function dragStart(ev){
  let index = $(ev.currentTarget).index() + 1;
  if (index > 0){
    ev.originalEvent.dataTransfer.setData("ssid", $('#scanTable tr').eq(index).find("td:eq(0)").text());
    ev.originalEvent.dataTransfer.setData("security", $('#scanTable tr').eq(index).find("td:eq(4)").text());
    ev.originalEvent.dataTransfer.setData("key-mgmt",$('#scanTable tr').eq(index).attr("key-mgmt"));
  }
}

function drop(ev){
  ev.preventDefault();
  $("#newSSID").val(ev.originalEvent.dataTransfer.getData("ssid"));
  $("#connectionName").val($("#newSSID").val());
  $("#security").val(ev.originalEvent.dataTransfer.getData("security"));
  $("#security").attr("key-mgmt",ev.originalEvent.dataTransfer.getData("key-mgmt"));
  $("#connectionNameDisplay").removeClass("has-error");
  $("#goToConnectionDisplay").removeClass("d-none");
}

function requestScan(){

  clearTimeout(statusUpdateTimerId);

  $("#bt-manual-scan").prop("disabled", true);
  $('#scanTable tbody').empty();
  $("#scanProgressDisplay").removeClass("d-none");
  $("#form-addWifiConnection").addClass("d-none");

  $.ajax({
    url: "accesspoints",
    type: "PUT",
  })
  .done(function(msg) {
    setTimeout(getScan, 15000);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    $("#bt-manual-scan").prop("disabled", false);
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function getScan(retry){

  $.ajax({
    url: "accesspoints",
    type: "GET",
    cache: false,
  })
  .done(function(msg) {

    if (msg.SDCERR == g_defines.SDCERR.SDCERR_FAIL){
      $("#status-ap-scanning").removeClass("d-none");
      $("#scanProgressDisplay").addClass("d-none");
      $("#bt-manual-scan").prop("disabled", false);
    }
    else if($("#scanTable").length > 0){

      let a_set = {};
      let bg_set = {};

      $(document).off("drop", "#form-addWifiConnection");
      $(document).off("dragover", "#form-addWifiConnection");

      $("#scanProgressDisplay").addClass("d-none");
      $('#scanTable tbody').empty();

      //For each SSID, the channels with best RSSI will be displayed (one for each band)
      msg["accesspoints"].sort( function (a, b){
          return a.Ssid == b.Ssid ? (b.Strength - a.Strength) : a.Ssid.localeCompare(b.Ssid);
      });

      for (let ap = 0; ap < msg["accesspoints"].length; ap++){
        //Skip NULL SSID
        if (!msg["accesspoints"][ap].Ssid || msg["accesspoints"][ap].Ssid.trim().length === 0)
          continue;

        //Items are already sorted based on RSSI. Items with lower RSSI won't be displayed.
        if (msg["accesspoints"][ap].Frequency > 4900) {
          if(a_set[msg["accesspoints"][ap].Ssid] && a_set[msg["accesspoints"][ap].Ssid] >= msg["accesspoints"][ap].Strength)
            continue;
            a_set[msg["accesspoints"][ap].Ssid] = msg["accesspoints"][ap].Strength
        }
        else {
          if(bg_set[msg["accesspoints"][ap].Ssid] && bg_set[msg["accesspoints"][ap].Ssid] >= msg["accesspoints"][ap].Strength)
            continue;
           bg_set[msg["accesspoints"][ap].Ssid] = msg["accesspoints"][ap].Strength
        }

        var markup =  "<tr><td>" + msg["accesspoints"][ap].Ssid +
                    "</td><td>" + wifi_freq_to_channel(msg["accesspoints"][ap].Frequency) +
                    "</td><td>" + msg["accesspoints"][ap].Strength +
                    "</td><td>" + msg["accesspoints"][ap].Security + "</td></tr>";
        $('#scanTable tbody').append(markup);
        $("#scanTable tr:last").attr("draggable", true);
        $("#scanTable tr:last").attr("key-mgmt", msg["accesspoints"][ap].Keymgmt);
      }

      $(document).on('dragstart', "#scanTable tbody tr", function(event){
        dragStart(event);
      });

      $("#scanTable tbody tr").on('click', function(){
        let row=$(this).closest("tr");
        clickScantableRow(row);
      });

      $(document).on("drop", "#form-addWifiConnection", function(event){
        drop(event);
      });

      $(document).on("dragover", "#form-addWifiConnection", function(event){
        allowDrop(event);
      });

      $("#bt-manual-scan").prop("disabled", false);

      if (-1 !== g_curr_user_permission.indexOf("networking_edit")){
        $("#form-addWifiConnection").removeClass("d-none");
      }
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function clickScanPage(){
  $.ajax({
    url: "plugins/networking/html/scan.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done(function( data ) {
    $(".active").removeClass("active");
    $("#networking_scan_main_menu").addClass("active");
    $("#networking_scan_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();

    getScan(0);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}

function createfileList(data, $sel){

  let val = $sel.val();

  $sel.empty();

  let empty_option = "<option>" + "None" + "</option>";
  $sel.append(empty_option);
  for(i=0; i<data.length; i++) {
    let option = "<option value=" + data[i] + ">" + data[i] + "</option>";
    $sel.append(option);
  }

  if(val){
    $sel.val(val);
    $sel.change();
  }
  else {
    $sel.val("");
  }
}

function createPacList(data){

  createfileList(data, $("#pac-file"));

}

function createCertList(data){

  createfileList(data, $("#ca-cert"));
  createfileList(data, $("#client-cert"));
  createfileList(data, $("#private-key"));
  createfileList(data, $("#phase2-ca-cert"));
  createfileList(data, $("#phase2-client-cert"));
  createfileList(data, $("#phase2-private-key"));

}

function getNetworkInterfaces(){

  return $.ajax({
    url: "networkInterfaces",
    type: "GET",
    cache: false,
  })
  .done(function(data) {

    if (data.SDCERR == g_defines.SDCERR.SDCERR_FAIL)
      return;

    interfaces = data.interfaces;
    if($("#interface-name").length > 0){

      let sel = $("#interface-name");
      sel.empty();

      for (iface in interfaces){
        let option = "<option value=" + interfaces[iface] + ">" + interfaces[iface] + "</option>";
        sel.append(option);
      }
      $("#interface-name").prop("selectedIndex", 0);
      $("#interface-name").change();
    }

    interfaces = checkValueInSelectList($("#interface-name option"), "br");
    if(interfaces.length > 0){
      let sel = $("#connection-master");
      let option = '<option value=""></option>';

      sel.empty();
      sel.append(option);

      for (iface in interfaces){
        option = "<option value=" + interfaces[iface] + ">" + interfaces[iface] + "</option>";
        sel.append(option);
      }
      $("#connection-master").prop("selectedIndex", 0);
    }
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });

}

function onChangeRadioMode(){

  var mode = $("#radio-mode").val();

  switch(mode){
    case "infrastructure":
      $("#auto-channel-selection-display").addClass("d-none");
      $("#auto-channel-selection").val(0);
      break;
    case "ap":
      $("#auto-channel-selection-display").removeClass("d-none");
      $("#auto-channel-selection").val(0);
      break;
    default:
      break;
  }
}

function onChangeIpv4Method(){
  let method = $("#ipv4-method").val();
  switch(method){
    case "disabled":
    case "manual":
    case "shared":
      $("#ipv4-addresses").attr('readonly', false);
      $("#ipv4-gateway").attr('readonly', false);
      $("#ipv4-dns").attr('readonly', false);
      break;

    case "auto":
    case "link-local":
    default:
      $("#ipv4-addresses").val('');
      $("#ipv4-gateway").val('');
      $("#ipv4-dns").val('');
      $("#ipv4-addresses").attr('readonly', true);
      $("#ipv4-gateway").attr('readonly', true);
      $("#ipv4-dns").attr('readonly', true);
      break;
  }
}


function onChangeIpv6Method(){
  let method = $("#ipv6-method").val();
  switch(method){
    case "manual":
    case "shared":
    case "disabled":
      $("#ipv6-addresses").attr('readonly', false);
      $("#ipv6-gateway").attr('readonly', false);
      $("#ipv6-dns").attr('readonly', false);
      break;
    case "auto":
    case "dhcp":
    case "ignore":
    case "link-local":
    default:
      $("#ipv6-addresses").val('');
      $("#ipv6-gateway").val('');
      $("#ipv6-dns").val('');
      $("#ipv6-addresses").attr('readonly', true);
      $("#ipv6-gateway").attr('readonly', true);
      $("#ipv6-dns").attr('readonly', true);
      break;
  }
}

function clickCertsPage() {
  $.ajax({
    url: "plugins/networking/html/certs.html",
    data: {},
    type: "GET",
    dataType: "html",
  })
  .done(function( data ) {
    $(".active").removeClass("active");
    $("#networking_certs_main_menu").addClass("active");
    $("#networking_certs_mini_menu").addClass("active");
    $("#main_section").html(data);
    setLanguage("main_section");
    clearReturnData();
    getFileList('cert', createCertTable);
  })
  .fail(function( xhr, textStatus, errorThrown) {
    httpErrorResponseHandler(xhr, textStatus, errorThrown)
  });
}


function createCertTable(certs) {

  function delCertFile(e){

    let row = $(this).closest('tr');
    if(!row.hasClass("bg-info"))
      return customMsg("Please select file first by clicking file name", true);

    let cert = $(this).closest(".btn-del-cert").attr('data-value');
    fileDelete('cert',  cert);
    getFileList('cert', createCertTable);
  }

  let tbody = $("#table-cert > tbody");

  tbody.empty();

  for(let i=0; i<certs.length; i++){

    row = '<tr>';
    row += '<td class="text-center">';
    row += certs[i];
    row += '</td>';

    row += '<td class="text-center">';
    row += '<input type="button" class="btn btn-primary btn-del-cert" value="' + g_i18nData['Delete'] + '" data-value="' + certs[i] + '">';
    row += '</td>';

    row += '</tr>';
    tbody.append(row);
  }

  $(document).on("click", ".btn-del-cert", delCertFile);

  $("#table-cert tbody").on("click", "tr td:first-child", function(e){
    row = $(this).closest('tr');
    row.addClass('bg-info').siblings().removeClass('bg-info');
  });
}

function createPacTable(pacs) {

  function delPacFile(e){

    let row = $(this).closest('tr');
    if(!row.hasClass("bg-info"))
      return customMsg("Please select file first by clicking file name", true);

    let pac = $(this).closest(".btn-del-pac").attr('data-value');
    fileDelete('pac',  pac);
    getFileList('pac', createPacTable);
  }

  let tbody = $("#table-pac > tbody");

  tbody.empty();

  for(let i=0; i<pacs.length; i++){

    row = '<tr>';
    row += '<td class="text-center">';
    row += pacs[i];
    row += '</td>';

    row += '<td class="text-center">';
    row += '<input type="button" class="btn btn-primary btn-del-pac" value="' + g_i18nData['Delete'] + '" data-value="' + pacs[i] + '">';
    row += '</td>';

    row += '</tr>';
    tbody.append(row);
  }

  $(document).on("click", ".btn-del-pac", delPacFile);

  $("#table-pac tbody").on("click", "tr td:first-child", function(e){
    row = $(this).closest('tr');
    row.addClass('bg-info').siblings().removeClass('bg-info');
  });
}
