// Av Stefan Skorpen - for Altaposten, 25.05.20

// bygger api kall
const endpoint = 'https://hydapi.nve.no/api/v1/Observations';   // url til apiet
const stationID = '208.3.0';                                   // målestasjon Svartfossberget
const parameters = '17,1000,1001,1003';                         // henter ut lufttemp, vannstand, vannføring, vanntemp
const resolutionTime = '0';                                     // 0, eller 60, eller 1440 -- instant, time og dag
const referenceTime = 'P13D/';                                  // henter perioden siste 13 dager til nå

// for debug
let hei = null;

// henter ut elementer fra html-siden
const vannstand = document.querySelector('.vannstand .inndata');
const vannforing = document.querySelector('.vannforing .inndata');
const vanntemp = document.querySelector('.vanntemp .inndata');
const lufttemp = document.querySelector('.lufttemp .inndata');
const klokkeslett = document.querySelector('.dato');

// metoden som henter data fra nve api, og fyller data inn i html-siden
async function fetchData() {
    const response = await fetch(`${endpoint}?StationID=${stationID}&Parameter=${parameters}&ResolutionTime=${resolutionTime}&ReferenceTime=${referenceTime}`, {
        headers: {
            Accept: 'application/json',
            // api key bør ikke ligge i koden, men dette er public gratis data så det går under tvil
            "X-API-Key": 'jrpoH6IPPkahaP4muXID9A==',
        },
    });
    const data = await response.json();
    
    // klokkeslett på htmlsiden
    const date = new Date(data.data[0].observations[0].time);
    const minutes = (date.getMinutes()<10?'0':'') + date.getMinutes();
    klokkeslett.textContent = `${date.getHours()-1}:${minutes}`; // offset med 1 time

    // let data1 = null;
    const labels = new Array;
    const data2 = new Array;
    
    // svar fra API kommer hulter til bulter, organiserer og publiserer verdier i html
    data.data.forEach(qty1 => {
        if (qty1.parameter === 1000) {
            // qty1.observationCount-1 er siste element rapportert
            vannstand.textContent = `${qty1.observations[qty1.observationCount-1].value.toFixed(2)}m`;
            // henter ut data for vannstand til chart
            data1 = Array.from(qty1.observations);
        }
        if (qty1.parameter === 1001) {
            vannforing.textContent = `${qty1.observations[qty1.observationCount-1].value.toFixed(1)}m³/s`;
        }
        if (qty1.parameter === 1003) {
            vanntemp.textContent = `${Math.round(qty1.observations[qty1.observationCount-1].value)}°`;
        }
        if (qty1.parameter === 17) {
            lufttemp.textContent = `${Math.round(qty1.observations[qty1.observationCount-1].value)}°`;
        }
    });

    // henter ut data fra observations for å lage tabell
    Object.values(data1).forEach(qty => {
        const date2 = new Date(qty.time);
        // gjør om fra timecode til dag.mnd
        labels.push(`${date2.getDate()}.${date2.getMonth()+1}`);
        data2.push(qty.value);
    })

    // men vil ikke bruke hver time, bare en måling per døgn. så lager ny tabell og henter bare ut hver 24. time
    // hvis det hentes "hver dag" (1440) fra api, så får man ikke med helt nyeste (0) observation, og det må vi ha
    let labels2 = new Array;
    let data3 = new Array;

    for (i = 0; i < labels.length; i=i+23) {
        labels2.push(labels[i]);
        data3.push(data2[i]);
    }

    // kaller funksjon for å lage tabell
    renderChart(data3, labels2);

    // debugging
    //hei = data;
    //console.log(data);
    return data;
}

// funksjon for å tegne graf vha chart.js
function renderChart(data, labels) {
    var ctx = document.getElementById("myChart").getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        
        data: {
            labels: labels,
            datasets: [{
                label: 'Vannstand siste 14 dager',
                data: data,
                backgroundColor: 'rgba(54, 37, 37, 0.5)',
                
            }]
        },
    });
}

// kjører koden ved load
fetchData();