#!/bin/bash
sam build
doppler run -- sh -c 'sam deploy --parameter-overrides "AlertEmail=$MY_EMAIL"'