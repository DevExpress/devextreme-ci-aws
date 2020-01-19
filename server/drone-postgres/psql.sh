#!/bin/bash

sudo docker exec -ti drone-postgres psql -U drone -d drone
