CONNECTION_NAME=PEAP_MSCHAPv2_CA_CERT

source global_settings

#known issue - only the last pahse2-autheap entry is retained.
echo ""
echo "PEAP MSCHAPv2 w/CA cert"
echo ""
echo "========================="
echo "Create connection"
${CURL_APP} --header "Content-Type: application/json" \
    --request POST \
    ${URL}/connection \
    -b cookie --insecure \
    --data '{
        "connection": {
            "autoconnect": 0,
            "id": "'"${CONNECTION_NAME}"'",
            "interface-name": "wlan0",
            "type": "802-11-wireless",
            "uuid": "",
            "zone": "trusted"
        },
        "802-11-wireless": {
            "mode": "infrastructure",
            "ssid": "'"${SSID}"'"
        },
        "802-11-wireless-security": {
            "key-mgmt": "wpa-eap",
            "proto": "rsn",
            "pairwise": "ccmp",
            "proactive-key-caching": 1
        },
        "802-1x": {
            "eap": "peap",
            "identity": "'"${WL_USERNAME}"'",
            "password": "'"${WL_PASSWORD}"'",
            "phase2-autheap": "mschapv2",
            "ca-cert": "'"${CA_CERT}"'",
            "client-cert": "None"
        }
    }'\
        | ${JQ_APP}

echo -e "\n"

