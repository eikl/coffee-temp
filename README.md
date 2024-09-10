# coffee-temp
Coffee pan temperature monitoring application

# Introduction
In this project, we use the coffee pan temperature as a proxy for measuring the presence of coffee.

# Usage
The file main.py runs on a Raspberry Pi, using two MAX31865 temperature sensor amplifiers to read PT1000 sensors. This data is sent to an S3 bucket, and another bucket is used to host a static website.

The static website consists of index.html and main.js. 

# Data availability
An archive of all data measured is available on request 
