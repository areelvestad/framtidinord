const endpoint = 'https://hydapi.nve.no/api/v1/Observations';
const stationID = '208.3.0';
const parameters = '17,1000,1001,1003';
const resolutionTime = '0';
const referenceTime = 'P13D/';

const vannstand = document.querySelector('.vannstand .inndata');
const vannforing = document.querySelector('.vannforing .inndata');
const vanntemp = document.querySelector('.vanntemp .inndata');
const lufttemp = document.querySelector('.lufttemp .inndata');
const klokkeslett = document.querySelector('.dato');

async function fetchData() {
    const url = `${endpoint}?StationID=${stationID}&Parameter=${parameters}&ResolutionTime=${resolutionTime}&ReferenceTime=${referenceTime}`;
    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'X-API-Key': 'jrpoH6IPPkahaP4muXID9A=='
        }
    });
    const json = await res.json();

    const time0 = new Date(json.data[0].observations[0].time);
    const mins = String(time0.getMinutes()).padStart(2, '0');
    klokkeslett.textContent = `${time0.getHours() - 1}:${mins}`;

    let rawData;
    const labels = [];
    const values = [];

    json.data.forEach(item => {
        const lastVal = item.observations[item.observationCount - 1].value;
        switch (item.parameter) {
            case 1000:
                vannstand.textContent = `${lastVal.toFixed(2)}m`;
                rawData = item.observations;
                break;
            case 1001:
                vannforing.textContent = `${lastVal.toFixed(1)}m³/s`;
                break;
            case 1003:
                vanntemp.textContent = `${Math.round(lastVal)}°`;
                break;
            case 17:
                lufttemp.textContent = `${Math.round(lastVal)}°`;
                break;
        }
    });

    rawData.forEach(entry => {
        const d = new Date(entry.time);
        labels.push(`${d.getDate()}.${d.getMonth() + 1}`);
        values.push(entry.value);
    });

    const dailyLabels = [];
    const dailyValues = [];
    for (let i = 0; i < labels.length; i += 23) {
        dailyLabels.push(labels[i]);
        dailyValues.push(values[i]);
    }

    renderChart(dailyValues, dailyLabels);
}

function renderChart(data, labels) {
    const maxLevel = Math.max(...data);
    const topY = maxLevel > 5.67 ? maxLevel + 1 : 6.67;
  
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
        // ─── CANVAS TITLE ─────────────────────────────────────────────────────
        plugins: {
          title: {
            display: true,
            text: 'Vannstand siste 14 dager',
            color: '#222',
            font: {
              size: 18,
              weight: '700'
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          annotation: {
            annotations: {
              yellow: {
                type: 'box',
                yMin: 4.75, yMax: 5.10,
                backgroundColor: 'rgba(255,235,59,0.3)',
                borderWidth: 0
              },
              orange: {
                type: 'box',
                yMin: 5.10, yMax: 5.67,
                backgroundColor: 'rgba(255,152,0,0.3)',
                borderWidth: 0
              },
              red: {
                type: 'box',
                yMin: 5.67, yMax: topY,
                backgroundColor: 'rgba(244,67,54,0.3)',
                borderWidth: 0
              }
            }
          },
          legend: { display: false }
        },
  
        // ─── AXES & GRID ───────────────────────────────────────────────────────
        scales: {
          x: {
            grid: {
              color: 'rgba(0,0,0,0)',
              drawBorder: true
            },
            ticks: {
              color: '#555',
              font: {
                size: 12,      // X-axis tick font size
                family: 'Arial'
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10
            },
            title: {
              display: false,
              text: 'Dato',
              color: '#333',
              font: {
                size: 14,
                weight: '400'
              },
              padding: { top: 10 }
            }
          },
          y: {
            min: 0,
            max: topY,
            grid: {
              color: 'rgba(0,0,0,0)',
              borderDash: [5,5],
              drawBorder: false
            },
            ticks: {
              color: '#000',
              font: {
                size: 16,    // Y-axis tick font size
                family: 'Arial'
              },
              beginAtZero: true,
              callback: v => `${v} m`
            },
            title: {
              display: false,
              text: 'Vannstand (m)',
              color: '#333',
              font: {
                size: 14,
                weight: '400'
              },
              padding: { right: 10 }
            }
          }
        },
  
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  
  


fetchData();