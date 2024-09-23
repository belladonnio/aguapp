document.addEventListener("DOMContentLoaded", function () {
    console.log("Página cargada y lista para interactuar");

    const excludedCategories = ["od", "ph", "ica", "sitios", "orden", "codigo", "fecha", "año", "campaña", "calidad_de_agua", "olores",
        "color", "espumas", "mat_susp", "cd_total_mg_l", "cr_total_mg_l", "tem_agua", "tem_aire", "hidr_deriv_petr_ug_l", "colif_fecales_ufc_100ml",
        "escher_coli_ufc_100ml", "enteroc_ufc_100ml", "turbiedad_ntu", "microcistina_ug_l", "clorofila_a_ug_l", "dqo_mg_l", "fosf_ortofos_mg_l"];
    let selectedSites = [];

    function loadCSVData(url, callback) {
        fetch(url)
            .then(response => response.text())
            .then(data => {
                const parsedData = Papa.parse(data, { header: true, skipEmptyLines: true });
                console.log("Datos CSV cargados:", parsedData.data);
                callback(parsedData.data);
            })
            .catch(error => console.error("Error al cargar el CSV:", error));
    }

// Grafico de Barra

function updateChart(data, selectedColumn) {
    console.log("Datos procesados:", data);

    const categoricalColumns = ['olores', 'color', 'espumas', 'mat_susp'];
    let labels = [], values = [], chartData, noInfoSites = [];

    if (window.myChart && typeof window.myChart.destroy === 'function') {
        window.myChart.destroy();
    }

    data.forEach(row => {
        if (row[selectedColumn] === "s/i") {
            noInfoSites.push(row["sitios"]);
        } else {
            const value = parseFloat(row[selectedColumn]);
            if (!isNaN(value)) {
                labels.push(row["sitios"]);
                values.push(value);
            }
        }
    });

    console.log("Labels filtrados:", labels);
    console.log("Datos filtrados (" + selectedColumn + "):", values);

    chartData = {
        labels: labels,
        datasets: [{
            label: selectedColumn,
            data: values,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };

    const options = {
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    autoSkip: false,
                    maxRotation: 90,
                    minRotation: 45,
                    callback: function (value, index) {
                        return labels[index];
                    }
                }
            },
            y: {
                beginAtZero: true
            }
        },
        plugins: {
            legend: {
                position: 'top',
                display: false,
            },
            tooltip: {
                callbacks: {
                    afterLabel: function (tooltipItem) {
                        const selectedValues = selectedSites.map(site => data.find(row => row["sitios"] === site)[selectedColumn]);
                        if (selectedValues.length > 1) {
                            const difference = selectedValues.reduce((acc, curr) => Math.abs(acc - curr));
                            return `Diferencia: ${difference.toFixed(2)}`;
                        }
                        return '';
                    }
                }
            },
            title: {
                display: false,
                // text: `Distribución de ${selectedColumn}`
            }
        },
        onClick: function (evt, activeElements) {
            if (activeElements.length > 0) {
                const index = activeElements[0].index;
                const siteName = labels[index];

                if (selectedSites.includes(siteName)) {
                    selectedSites = selectedSites.filter(site => site !== siteName);
                } else {
                    if (selectedSites.length < 5) {
                        selectedSites.push(siteName);
                    } else {
                        selectedSites = [siteName];
                    }
                }

                updateRadarChart(data);
                updateRadar2Chart(data); // Actualiza el radar 2
                updateRadar3Chart(data); // Actualiza el radar 3
                updateChartWithSelectedParam(data);
                updateTable(data, selectedColumn);
                updateBarColors(this);
            }
        }
    };

    // Detectar resolución de pantalla y ajustar el gráfico
    const mediaQuery = window.matchMedia("(max-width: 720px)");
    function handleResize(e) {
        if (e.matches) {
            // Pantalla menor a 720px
            options.scales.x.display = false; // Ocultar nombres de los sitios
            document.getElementById('myChart').parentNode.style.height = "100%"; // Gráfico ocupa el 100% del contenedor
        } else {
            // Pantalla mayor o igual a 720px
            options.scales.x.display = true; // Mostrar nombres de los sitios
            document.getElementById('myChart').parentNode.style.height = ""; // Restablecer altura del contenedor
        }
    }

    // Escuchar cambios en la resolución
    mediaQuery.addListener(handleResize);
    handleResize(mediaQuery); // Ejecutar al cargar la página

    window.myChart = new Chart(document.getElementById('myChart'), {
        type: 'bar',
        data: chartData,
        options: options
    });

    const noInfoParagraph = document.getElementById('noInfoSites');
    if (noInfoSites.length > 0) {
        noInfoParagraph.innerHTML = `Los sitios que no tienen información son:<br>${noInfoSites.join('<br>')}`;
    } else {
        noInfoParagraph.textContent = '';
    }
}


    // Radar 1

    function updateRadarChart(data) {
        if (selectedSites.length === 0) return;

        const radarLabels = Object.keys(data[0]).filter(key => !excludedCategories.includes(key));
        const datasets = selectedSites.map((site, i) => {
            const siteData = data.find(row => row["sitios"] === site);

            // Verificar que se haya encontrado siteData
            if (!siteData) {
                console.warn(`No se encontraron datos para ${site}`);
                return null;
            }

            let dataValues = radarLabels.map(label => {
                return parseFloat(siteData[label]) || 0;
            });

            // Asegurarse de que el área se cierre
            if (dataValues.length > 0) {
                dataValues.push(dataValues[0]); // Cierra el área
            }

            return {
                label: site,
                data: dataValues,
                borderColor: getColor(i),
                backgroundColor: getColor(i, 0.2),
                borderWidth: 2,
                fill: true
            };
        }).filter(dataset => dataset !== null); // Filtrar datasets nulos

        // Asegúrate de que las etiquetas no tengan duplicados y elimina el último elemento
        const labelsWithClosure = radarLabels.length > 0 ? [...radarLabels, radarLabels[0]].slice(0, -1) : radarLabels;

        if (window.radarChart && typeof window.radarChart.destroy === 'function') {
            window.radarChart.destroy();
        }

        window.radarChart = new Chart(document.getElementById('radarChart'), {
            type: 'radar',
            data: {
                labels: labelsWithClosure,
                datasets: datasets
            },
            options: {
                plugins: {
                    legend: {
                        position: 'top',
                        display: false,
                    },
                    title: {
                        display: false,
                        // text: `Comparación entre sitios: `
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true
                    }
                }
            }
        });

        console.log("Gráfico radar actualizado con éxito.");
    }

    // Radar 2

    function updateRadar2Chart(data) {
        if (selectedSites.length === 0) {
            console.log("No hay sitios seleccionados.");
            return;
        }

        // Filtra los sitios únicos
        const uniqueSites = [...new Set(selectedSites)];
        const radarLabels = ["hidr_deriv_petr_ug_l", "clorofila_a_ug_l  ", "microcistina_ug_l"];
        // "cr_total_mg_l ", "cd_total_mg_l ",

        console.log("Datos del CSV:", data); // Ver todos los datos del CSV

        const datasets = uniqueSites.map((site, i) => {
            const siteData = data.find(row => row["sitios"] === site);
            console.log(`Buscando datos para ${site}:`, siteData); // Ver datos por sitio

            // Verifica que se haya encontrado siteData
            if (!siteData) {
                console.warn(`No se encontraron datos para ${site}`);
                return null;
            }

            let dataValues = radarLabels.map(label => {
                let rawValue = siteData[label];

                // Verifica si el valor contiene el símbolo "<"
                if (typeof rawValue === "string" && rawValue.includes("<")) {
                    // Extrae el número después de "<" y usa la mitad de ese valor
                    let parsedValue = parseFloat(rawValue.replace("<", ""));
                    return parsedValue / 2; // Puedes ajustar este valor según tu criterio
                }

                // Convertir a número o usar 0 si no es válido
                const value = parseFloat(rawValue) || 0;
                console.log(`Valor de ${label} para ${site}:`, value); // Ver valores de cada etiqueta
                return value;
            });

            // Cierra el área del radar agregando el primer valor al final
            dataValues.push(dataValues[0]); // Cierra el área
            console.log(`Datos para ${site} (con cierre):`, dataValues); // Ver datos con cierre

            return {
                label: site,
                data: dataValues,
                borderColor: getColor(i),
                backgroundColor: getColor(i, 0.2),
                borderWidth: 2,
                fill: true
            };
        }).filter(dataset => {
            if (dataset === null) {
                console.warn("Se omitió un dataset nulo.");
                return false;
            }
            return true; // Filtrar valores nulos
        });

        // Asegúrate de que las etiquetas no tengan duplicados y elimina el último elemento
        const labelsWithClosure2 = [...radarLabels, radarLabels[0]].slice(0, -1);
        console.log("Etiquetas ajustadas:", labelsWithClosure2); // Ver etiquetas ajustadas

        // Muestra los datasets antes de crear el gráfico
        console.log("Datasets para el gráfico:", datasets);

        if (window.radar2Chart && typeof window.radar2Chart.destroy === 'function') {
            window.radar2Chart.destroy();
            console.log("Gráfico anterior destruido.");
        }

        window.radar2Chart = new Chart(document.getElementById('radar2Chart'), {
            type: 'radar',
            data: {
                labels: labelsWithClosure2,
                datasets: datasets
            },
            options: {
                plugins: {
                    legend: {
                        display: false  // Ocultar las leyendas
                    },
                    // tooltip: {
                    //     enabled: false  // Desactivar tooltips
                    // },
                    title: {
                        display: false,
                        // text: `Temperaturas: ${uniqueSites.join(' vs ')}`
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true
                    }
                }
            }
        });

        console.log("Gráfico radar actualizado con éxito.");
    }



    // Radar 3: Contaminantes
    function updateRadar3Chart(data) {
        if (selectedSites.length === 0) {
            console.log("No hay sitios seleccionados.");
            return;
        }

        // Filtra los sitios únicos
        const uniqueSites = [...new Set(selectedSites)];
        const radarLabels = ["colif_fecales_ufc_100ml", "escher_coli_ufc_100ml", "enteroc_ufc_100ml"];

        console.log("Datos del CSV:", data); // Ver todos los datos del CSV

        const datasets = uniqueSites.map((site, i) => {
            const siteData = data.find(row => row["sitios"] === site);
            console.log(`Buscando datos para ${site}:`, siteData); // Ver datos por sitio

            // Verifica que se haya encontrado siteData
            if (!siteData) {
                console.warn(`No se encontraron datos para ${site}`);
                return null;
            }

            let dataValues = radarLabels.map(label => {
                const value = parseFloat(siteData[label]) || 0;
                console.log(`Valor de ${label} para ${site}:`, value); // Ver valores de cada etiqueta
                return value;
            });

            // Cierra el área del radar agregando el primer valor al final
            dataValues.push(dataValues[0]); // Cierra el área
            console.log(`Datos para ${site} (con cierre):`, dataValues); // Ver datos con cierre

            return {
                label: site,
                data: dataValues,
                borderColor: getColor(i),
                backgroundColor: getColor(i, 0.2),
                borderWidth: 2,
                fill: true
            };
        }).filter(dataset => {
            if (dataset === null) {
                console.warn("Se omitió un dataset nulo.");
                return false;
            }
            return true; // Filtrar valores nulos
        });

        // Asegúrate de que las etiquetas no tengan duplicados y elimina el último elemento
        const labelsWithClosure3 = [...radarLabels, radarLabels[0]].slice(0, -1);
        console.log("Etiquetas ajustadas:", labelsWithClosure3); // Ver etiquetas ajustadas

        // Muestra los datasets antes de crear el gráfico
        console.log("Datasets para el gráfico:", datasets);

        if (window.radar3Chart && typeof window.radar3Chart.destroy === 'function') {
            window.radar3Chart.destroy();
            console.log("Gráfico anterior destruido.");
        }

        window.radar3Chart = new Chart(document.getElementById('radar3Chart'), {
            type: 'radar',
            data: {
                labels: labelsWithClosure3,
                datasets: datasets
            },
            options: {
                plugins: {
                    legend: {
                        display: false  // Ocultar las leyendas
                    },
                    // tooltip: {
                    //     enabled: false  // Desactivar tooltips
                    // },
                    title: {
                        display: false
                        // text: `Temperaturas: ${uniqueSites.join(' vs ')}`
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true
                    }
                }
            }
        });

        console.log("Gráfico radar actualizado con éxito.");
    }


    // Tabla de comparación
    function updateTable(data, selectedColumn) {
        const table = document.getElementById("comparisonTable");
        table.innerHTML = '';

        if (selectedSites.length === 0) return;

        const headerRow = document.createElement("tr");
        const siteHeader = document.createElement("th");
        siteHeader.textContent = "Sitio";
        headerRow.appendChild(siteHeader);

        const valueHeader = document.createElement("th");
        valueHeader.textContent = selectedColumn;
        headerRow.appendChild(valueHeader);

        table.appendChild(headerRow);

        selectedSites.forEach(site => {
            const row = document.createElement("tr");

            const siteCell = document.createElement("td");
            siteCell.textContent = site;
            row.appendChild(siteCell);

            const valueCell = document.createElement("td");
            const siteData = data.find(row => row["sitios"] === site);
            valueCell.textContent = siteData[selectedColumn];

            // Centrando el contenido de la celda con text-align: center
            valueCell.style.textAlign = "center";

            row.appendChild(valueCell);
            table.appendChild(row);
        });
    }

    // Colores del Gráfico de Barras

    function updateBarColors(chart) {
        chart.data.datasets[0].backgroundColor = chart.data.labels.map(label => {
            return selectedSites.includes(label) ? getColor(selectedSites.indexOf(label)) : 'rgba(75, 192, 192, 0.2)';
        });
        chart.update();
    }

    function getColor(index, opacity = 1) {
        const colors = [
            `rgba(255, 99, 132, ${opacity})`,
            `rgba(54, 162, 235, ${opacity})`,
            `rgba(255, 206, 86, ${opacity})`,
            `rgba(75, 192, 192, ${opacity})`,
            `rgba(153, 102, 255, ${opacity})`
        ];
        return colors[index % colors.length];
    }


    // Función para crear el gráfico donut y agregar la funcionalidad de tooltip
function createDoughnutChart(data, selectedParam) {
    const counts = {
        "Presencia": 0,
        "Ausencia": 0,
        "Sin información": 0
    };

    const sitios = {
        "Presencia": [],
        "Ausencia": [],
        "Sin información": []
    };

    // Procesar los datos y contar las ocurrencias, además de agrupar sitios
    data.forEach(row => {
        const value = row[selectedParam]?.toLowerCase() || "";
        const sitio = row.sitios || "Sin nombre";  // Asume que la columna con los nombres de los sitios se llama "sitio", usar "Sin nombre" si está vacío

        if (value.includes("presencia") || value.includes("presente")) {
            counts["Presencia"]++;
            sitios["Presencia"].push(sitio);
        } else if (value.includes("ausencia") || value.includes("ausente")) {
            counts["Ausencia"]++;
            sitios["Ausencia"].push(sitio);
        } else if (value.includes("s/i")) {
            counts["Sin información"]++;
            sitios["Sin información"].push(sitio);
        }
    });

    const chartData = {
        labels: ["Presencia", "Ausencia", "Sin información"],
        datasets: [{
            data: [counts["Presencia"], counts["Ausencia"], counts["Sin información"]],
            backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
            hoverBackgroundColor: ['#36A2EB', '#FF6384', '#FFCE56']
        }]
    };

    // Destruir gráfico anterior si existe
    if (window.doughnutChart && typeof window.doughnutChart.destroy === 'function') {
        window.doughnutChart.destroy();
    }

    // Crear el gráfico de donas con el tooltip modificado
    const ctx = document.getElementById('doughnutChart').getContext('2d');
    window.doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    // text: `Distribución del parámetro: ${selectedParam}`
                },
                tooltip: {
                    callbacks: {
                        // Personalizar el tooltip para mostrar los sitios
                        label: function (tooltipItem) {
                            const label = chartData.labels[tooltipItem.dataIndex];
                            const count = chartData.datasets[0].data[tooltipItem.dataIndex];
                            const sitiosList = sitios[label].length > 0 ? sitios[label].join(', ') : 'Ningún sitio';  // Obtener los sitios correspondientes a la categoría
                            
                            // Dividir los sitios en líneas separadas
                            return [`${label}: ${count}`, `Sitios:`, ...sitiosList.split(', ')];
                        }
                    }
                }
            }
        }
    });
}



    // Función para actualizar el gráfico según el parámetro seleccionado
    function updateChartWithSelectedParam(data) {
        const paramSelect = document.getElementById('paramSelect');
        paramSelect.addEventListener('change', function () {
            const selectedParam = paramSelect.value;
            createDoughnutChart(data, selectedParam);
        });

        // Cargar el gráfico con el primer parámetro por defecto
        createDoughnutChart(data, paramSelect.value);
    }




    // CSV Loader
    const selectColumnElement = document.getElementById('selectColumn');
    selectColumnElement.addEventListener('change', function () {
        const selectedColumn = selectColumnElement.value;
        loadCSVData("datos_agua_verano_2024.csv", function (data) {
            updateChart(data, selectedColumn);
            updateTable(data, selectedColumn);
        });
    });

    loadCSVData("datos_agua_verano_2024.csv", function (data) {
        const selectedColumn = selectColumnElement.value;
        updateChart(data, selectedColumn);
    });
});
