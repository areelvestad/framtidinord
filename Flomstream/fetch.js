const stationID = '212.11.0';               // Stasjons-ID
const apiKey = 'HGc6Plv0GEigEHBtAk8S7w==';
const endpointObs = 'https://hydapi.nve.no/api/v1/Observations';
const endpointMeta = 'https://hydapi.nve.no/api/v1/Stations';

const parameters = '17,1000,1001,1003';     // lufttemp, vannstand, vannføring, vanntemp
const resolutionTime = '0';                     // øyeblikkelig
const referenceTime = 'P13D/';                 // siste 13 dager + i dag

// DOM‐referanser
const elVannstand = document.querySelector('.vannstand .inndata');
const elVannforing = document.querySelector('.vannforing .inndata');
const elVanntemp = document.querySelector('.vanntemp .inndata');
const elLufttemp = document.querySelector('.lufttemp .inndata');
const elKlokke = document.querySelector('.dato');
const elTitle = document.querySelector('.title');
const elStationName = document.querySelector('.station');

// Variabler for flomsone‐grenser
let yellowMin, yellowMax, orangeMin, orangeMax, redMin;

async function fetchStationMeta() {
  const url = `${endpointMeta}?StationId=${stationID}&Active=1`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-API-Key': apiKey
    }
  });
  const json = await res.json();
  if (!json.data || !json.data.length) return;

  const st = json.data[0];

  // Sett elvenavn og stasjonsnavn
  elTitle.textContent = st.riverName;
  elStationName.textContent = `📍 ${st.stationName}`;

  // Les terskelverdier for flom (hm = middelflom, h5 = 5-års, h50 = 50-års)
  yellowMin = st.hm;
  yellowMax = st.h5;
  orangeMin = yellowMax;
  orangeMax = st.h50;
  redMin = orangeMax;
}

async function fetchData() {
  const url = `${endpointObs}?StationID=${stationID}`
    + `&Parameter=${parameters}`
    + `&ResolutionTime=${resolutionTime}`
    + `&ReferenceTime=${referenceTime}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-API-Key': apiKey
    }
  });

  const json = await res.json();

  // --- hent vannstand og tidspunkt ---
  const wsSerie = json.data.find(item => item.parameter === 1000);
  if (wsSerie.observations.length) {
    const sisteObs = wsSerie.observations.at(-1); // riktig: siste element
    const v = sisteObs.value;
    elVannstand.textContent = `${v.toFixed(2)} m`;
    elKlokke.textContent = new Date(sisteObs.time)
      .toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  }

  const elVannforingContainer = document.querySelector('.vannforing');
  const elVanntempContainer = document.querySelector('.vanntemp');
  const elLufttempContainer = document.querySelector('.lufttemp');

  let rawData;
  json.data.forEach(item => {
    if (!item.observations.length) {
      
      // ingen data for denne parameteren
      if (item.parameter === 17) elLufttempContainer.style.display = 'none';
      else if (item.parameter === 1003) elVanntempContainer.style.display = 'none';
      else if (item.parameter === 1001) elVannforingContainer.style.display = 'none';
      return;
    }
    const obs = item.observations.at(-1);
    const v = obs.value;
    switch (item.parameter) {
      case 1000:
        elVannstand.textContent = `${v.toFixed(2)} m`;
        rawData = item.observations;
        break;
      case 1001:
        elVannforing.textContent = `${v.toFixed(1)} m³/s`;
        break;
      case 1003:
        elVanntemp.textContent = `${Math.round(v)} °`;
        break;
      case 17:
        elLufttemp.textContent = `${Math.round(v)} °`;
        break;
    }
  });

  // Bygg labels/values for graf (daglig snapshot)
  const labels = [], values = [];
  rawData.forEach(entry => {
    const d = new Date(entry.time);
    labels.push(`${d.getDate()}.${d.getMonth() + 1}`);
    values.push(entry.value);
  });
  const dailyLabels = [], dailyValues = [];
  for (let i = 0; i < labels.length; i += 23) {
    dailyLabels.push(labels[i]);
    dailyValues.push(values[i]);
  }

  renderChart(dailyValues, dailyLabels);
}

function renderChart(data, labels) {
  const maxLevel = Math.max(...data);
  const topY = Math.max(maxLevel, redMin) + .55;

  const ctx = document.getElementById('flomGraf').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Vannstand siste 14 dager',
        data,
        borderColor: 'rgba(0, 123, 255, 0.8)',
        borderWidth: 3,
        tension: 0.3,
        fill: true,
        pointRadius: 0
      }]
    },
    options: {
      plugins: {
        annotation: {
          drawTime: 'beforeDatasetsDraw',
          annotations: {
            yellow: {
              type: 'box',
              yMin: yellowMin, yMax: yellowMax,
              backgroundColor: 'rgba(255,235,59,0.3)',
              borderWidth: 0
            },
            orange: {
              type: 'box',
              yMin: orangeMin, yMax: orangeMax,
              backgroundColor: 'rgba(255,152,0,0.3)',
              borderWidth: 0
            },
            red: {
              type: 'box',
              yMin: redMin, yMax: topY,
              backgroundColor: 'rgba(244,67,54,0.3)',
              borderWidth: 0
            }
          }
        },
        title: {
          display: true,
          text: 'Vannstand siste 14 dager',
          font: { size: 18 },
          padding: { bottom: 10 }
        },
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0)', drawBorder: true },
          ticks: { display: false }
        },
        y: {
          min: 0, max: topY,
          grid: { color: 'rgba(0,0,0,0)', borderDash: [5, 5], drawBorder: false },
          ticks: {
            callback: v => `${parseFloat(v.toFixed(2))} m`,
            font: { size: 16 }
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

(async function init() {
  await fetchStationMeta();
  await fetchData();
})();
