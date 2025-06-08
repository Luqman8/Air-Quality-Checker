const apiKey = '43660a90b152433f6859d4c38a0fb771'
let chart = null;
let lineChart = null;

document.getElementById("autoDetect").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
  } else {
    alert("Geolocation is not supported by this browser.");
  }

  function success(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    fetchAirQuality(lat, lon, true);
    fetchForecastAQ(lat, lon);
  }

  function error() {
    alert("Unable to retrieve your location.");
  }
});

async function getAirQuality() {
  const city = document.getElementById('cityInput').value.trim();
  const output = document.getElementById('aqi-output');
  const loading = document.getElementById('loading');

  if (!city) {
    output.innerText = 'Please enter a city name.';
    return;
  }

  loading.style.display = 'block';
  output.innerHTML = '';

  try {
    const geoResp = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
    const geoData = await geoResp.json();

    if (!geoData.length) {
      output.innerText = 'City not found.';
      loading.style.display = 'none';
      return;
    }

    const { lat, lon } = geoData[0];
    fetchAirQuality(lat, lon, false);
    fetchForecastAQ(lat, lon);

  } catch (err) {
    output.innerText = 'Error fetching data.';
    loading.style.display = 'none';
  }
}

function fetchAirQuality(lat, lon, isAuto = false) {
  const output = isAuto ? document.getElementById("output") : document.getElementById("aqi-output");
  const api = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const levels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
  const colors = ["#009966", "#ffde33", "#ff9933", "#cc0033", "#660099"];
  const healthTips = {
    1: "Air quality is good. Feel free to enjoy the outdoors!",
    2: "Fair air quality. Sensitive groups should limit prolonged outdoor exertion.",
    3: "Moderate pollution. Consider limiting long outdoor activity.",
    4: "Unhealthy air. Avoid outdoor activity and wear a mask if you must go out.",
    5: "Very poor! Stay indoors and use an air purifier if available."
  };

  fetch(api)
    .then(res => res.json())
    .then(data => {
      const aqi = data.list[0].main.aqi;
      const components = data.list[0].components;

      output.innerHTML = `
        ${isAuto ? '<h3>Air Quality at Your Current Location</h3>' : ''}
        <div style="color: ${colors[aqi - 1]}; font-weight: bold;">AQI: ${aqi} - ${levels[aqi - 1]}</div>
        <div>PM2.5: ${components.pm2_5} µg/m³</div>
        <div>CO: ${components.co} µg/m³</div>
        <div>NO₂: ${components.no2} µg/m³</div>
        <div style="margin-top: 10px; font-style: italic; color: #444;">
          <strong>Health Tip:</strong> ${healthTips[aqi]}
        </div>
      `;

      drawBarChart(components);
    })
    .catch(() => {
      output.innerText = 'Error fetching air quality.';
    })
    .finally(() => {
      document.getElementById('loading').style.display = 'none';
    });
}

function drawBarChart(components) {
  const ctx = document.getElementById('pollutantChart').getContext('2d');
  const data = {
    labels: ['PM2.5', 'CO', 'NO₂'],
    datasets: [{
      label: 'Pollutant Levels (µg/m³)',
      data: [components.pm2_5, components.co, components.no2],
      backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
      borderWidth: 1
    }]
  };

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function fetchForecastAQ(lat, lon) {
  const forecastApi = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;

  fetch(forecastApi)
    .then(res => res.json())
    .then(data => {
      const times = [];
      const pm25 = [];

      data.list.slice(0, 12).forEach(entry => {
        const date = new Date(entry.dt * 1000);
        times.push(date.getHours() + ":00");
        pm25.push(entry.components.pm2_5);
      });

      drawLineChart(times, pm25);
    })
    .catch(() => {
      console.error("Error fetching forecast data.");
    });
}

function drawLineChart(labels, dataPoints) {
  const ctx = document.getElementById("forecastChart").getContext("2d");

  if (lineChart) lineChart.destroy();

  lineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Forecast PM2.5 (µg/m³)",
        data: dataPoints,
        fill: false,
        borderColor: "#00796b",
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}
