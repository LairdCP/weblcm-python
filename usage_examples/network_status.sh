source global_settings

echo "========================="
echo "network status"
${CURL_APP} --header "Content-Type: application/json" \
    --request GET \
    ${URL}/networkStatus \
    -b cookie --insecure \
| ${JQ_APP}
echo -e "\n"
