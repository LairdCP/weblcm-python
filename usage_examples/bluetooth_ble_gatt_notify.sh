source global_settings

JQ_APP="${JQ_APP:-smart_jq}"
# Example UUIDs taken from Nordic nRF Connect SDK peripheral uart example project
GATT_SVC_UUID="${GATT_SVC_UUID:-6e400001-b5a3-f393-e0a9-e50e24dcca9e}"
GATT_CHR_UUID="${GATT_CHR_UUID:-6e400003-b5a3-f393-e0a9-e50e24dcca9e}"
NOTIFY_ENABLE="${NOTIFY_ENABLE:-true}"

function smart_jq {
    local input=$(cat)
    if [ "${input:0:1}" == "{" ]; then
        echo "${input}" | jq
    else
        echo "${input}"
    fi
}

echo -e "\n========================="
echo "Bluetooth GATT notify"
echo "Please invoke bluetooth_ble_connect.sh prior to receive response."

if [ -z "$BT_DEVICE" ]
then
    echo "Please invoke with Bluetooth device address set e.g. BT_DEVICE=xx:xx:xx:xx:xx:xx $0"
    exit
fi

${CURL_APP} --location --request PUT ${URL}/bluetooth/${BT_CONTROLLER}/${BT_DEVICE} \
    --header "Content-Type: application/json" \
    -b cookie --insecure\
    --data '{
        "command": "bleGatt",
        "operation": "notify",
        "enable": '${NOTIFY_ENABLE}',
        "svcUuid": "'"${GATT_SVC_UUID}"'",
        "chrUuid": "'"${GATT_CHR_UUID}"'"
        }' \
    | ${JQ_APP}

