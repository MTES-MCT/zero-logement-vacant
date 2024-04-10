#!/bin/bash

echo "Run bin/start.sh..."

if [ "$ZLV_APP" = "server" ] ; then
  exec npm run start
fi

if [ "$ZLV_APP" = "queue" ] ; then
  exec npm run queue:start
fi
