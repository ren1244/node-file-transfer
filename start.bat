@echo off

if not exist node_modules (
    call npm install
    cls
)

node main.js
