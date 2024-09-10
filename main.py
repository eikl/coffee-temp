import time
import json
import board
import digitalio
import adafruit_max31865
import boto3

# Setup for two MAX31865 sensors
spi = board.SPI()

# Sensor Setup
cs1 = digitalio.DigitalInOut(board.D27)  # Chip select pin for Sensor 1
sensor1 = adafruit_max31865.MAX31865(spi, cs1, rtd_nominal=100.0, ref_resistor=430.0)
cs2 = digitalio.DigitalInOut(board.D22)  # Chip select pin for Sensor 2
sensor2 = adafruit_max31865.MAX31865(spi, cs2, rtd_nominal=100.0, ref_resistor=430.0)

# AWS S3 Setup
bucket_name = "oh-data-bucket"
object_key = "myKey"  # File name in S3 bucket
s3_client = boto3.client('s3')

# Buffer to store last 100 seconds of data
timestamps = []
temperature1 = []
temperature2 = []
derivative_timestamps = []

# Sampling interval in seconds
sampling_interval = 1.0
collection_duration = 5
max_buffer_length = 100  # 100 seconds of data

def calculate_average(data):
    return sum(data) / len(data) if data else 0

def calculate_derivative(timestamps, data):
    if len(data) < 2:
        return 0  # Not enough data to calculate derivative

    derivatives = [(data[i] - data[i - 1]) / (timestamps[i] - timestamps[i - 1]) for i in range(1, len(data)) if timestamps[i] != timestamps[i - 1]]
    return sum(derivatives) / len(derivatives) if derivatives else 0

def send_to_s3(timestamps, temperature1, temperature2):
    data = {
        "timestamps": timestamps,
        "temperature1": temperature1,
        "temperature2": temperature2
    }
    json_data = json.dumps(data)

    try:
        s3_client.put_object(Bucket=bucket_name, Key=object_key, Body=json_data)
        print(f"Data successfully uploaded to s3://{bucket_name}/{object_key}")
        print(json_data)
    except Exception as e:
        print(f"Failed to upload data to S3: {e}")

try:
    while True:
        temp1_data = []
        temp2_data = []
        derivative_timestamps = []
        start_time = time.time()

        while time.time() - start_time < collection_duration:
            derivative_timestamps.append(int(time.time()))
            temp1_data.append(sensor1.temperature)
            temp2_data.append(sensor2.temperature)
            time.sleep(sampling_interval)

        avg_temp1 = calculate_average(temp1_data)
        avg_temp2 = calculate_average(temp2_data)

        derivative_temp1 = calculate_derivative(derivative_timestamps, temp1_data)
        derivative_temp2 = calculate_derivative(derivative_timestamps, temp2_data)

        timestamp = int(time.time())

        timestamps.append(timestamp)
        temperature1.append(avg_temp1)
        temperature2.append(avg_temp2)

        if len(timestamps) > max_buffer_length:
            timestamps.pop(0)
            temperature1.pop(0)
            temperature2.pop(0)
        if len(derivative_timestamps) > max_buffer_length:
            derivative_timestamps.pop(0)

        send_to_s3(timestamps, temperature1, temperature2)
        print('Sent data')

except KeyboardInterrupt:
    print("Data collection stopped.")

except Exception as e:
    print(f"An error occurred: {e}")
