let humArr = [], tempArr = [], upArr = [];

let tippuu = false;
let kahvi = false;

let myChart = Highcharts.chart('container1', {
    chart: {
        animation: false,
        backgroundColor: 'rgba(0,0,0,0)'
    },
    title: {
        text: ''
    },
    yAxis: {
        title: {
            text: 'Lämpötila (C)'
        }
    },
    xAxis: {
        type: 'datetime',
        labels: {
            format: '{value:%H:%M}'
        }
    },
    legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle'
    },
    plotOptions: {
        series: {
            label: {
                connectorAllowed: false
            }
        }
    },
    series: [{
        name: 'Pannu 1',
        data: []
    }, {
        name: 'Pannu 2',
        data: []
    }],
    responsive: {
        rules: [{
            condition: {
                maxWidth: 500
            },
            chartOptions: {
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom'
                }
            }
        }]
    }
});

let lastRequestTime = 0;
const MIN_INTERVAL = 5000;

let getWeatherData = function () {
    const currentTime = new Date().getTime();
    
    if (currentTime - lastRequestTime < MIN_INTERVAL) {
        console.log("Rate limit in effect. Skipping request.");
        return;
    }

    lastRequestTime = currentTime;

    $.ajax({
        type: "GET",
        url: "https://oh-data-bucket.s3.eu-north-1.amazonaws.com/myKey",
        dataType: "json",
        async: false,
        success: function (data) {
            console.log('data', data);
            drawChart(data);
            updateLogic(data);
        },
        error: function (xhr, status, error) {
            console.error("JSON error: " + status);
        }
    });
}

let drawChart = function (data) {
    let { temperature1, temperature2, timestamps } = data;

    function convertToHelsinkiTime(timestamp) {
        let date = new Date(timestamp * 1000);
        let helsinkiOffset = date.getTimezoneOffset() === -120 ? 120 : 180;
        return date.getTime() + helsinkiOffset * 60000;
    }

    const temp1Data = timestamps.map((timestamp, index) => [convertToHelsinkiTime(timestamp), temperature1[index]]);
    const temp2Data = timestamps.map((timestamp, index) => [convertToHelsinkiTime(timestamp), temperature2[index]]);

    myChart.series[0].setData(temp1Data, true);
    myChart.series[1].setData(temp2Data, true);

    // Add a dashed horizontal line at y=55
    myChart.yAxis[0].addPlotLine({
        value: 55,
        color: 'red',
        width: 1,
        zIndex: 5,
        dashStyle: 'dash',
        label: {
            text: 'Pannu täysillä',
            align: 'right',
            x: -10,
            y: -5,
            style: {
                color: 'red'
            }
        }
    });
}

let updateLogic = function (data) {
    let { temperature1, temperature2 } = data;

    // Check if the latest temperatures are above or below 50
    let latestTemperature1 = temperature1[temperature1.length - 1];
    let latestTemperature2 = temperature2[temperature2.length - 1];

    // Set kahvi to true if either temperature is above 50
    if (latestTemperature1 > 50 || latestTemperature2 > 50) {
        kahvi = true;
    } else {
        kahvi = false;
    }

    // Log the current state for debugging
    console.log(`Temperature1: ${latestTemperature1}, Temperature2: ${latestTemperature2}, kahvi: ${kahvi}`);
}

// Polling with client-side rate limiting
let intervalTime = 1000;
setInterval(() => {
    getWeatherData();
}, intervalTime);
