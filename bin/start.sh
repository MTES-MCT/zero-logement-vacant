#!/bin/bash

if [ "$ZLV_APP" = "server" ] ; then
  npm run start
fi

if [ "$ZLV_APP" = "queue" ] ; then
  npm run queue:start
fi
