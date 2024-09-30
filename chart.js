async function fetchUserReadings() {
    const response = await fetch('/trends'); 
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.json();
}

async function createChart() {
    try {
        const readings = await fetchUserReadings();
        console.log('Fetched readings:', readings); 
        
        const labels = readings.map(reading => {
            const date = new Date(reading.date); 
            return date.toLocaleString('en-US', { 
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
            });
        });
        
        const data = readings.map(reading => reading.recording); 


        console.log('Labels:', labels); 
        console.log('Data:', data);


        const ctx = document.getElementById('readingsChart').getContext('2d');

        const backgroundColors = data.map(reading => {
            if (reading < 4 || reading > 11.1) {
                return 'rgba(255, 0, 0, 1)'; 
            }
            return 'rgba(75, 192, 192, 0.2)'; 
        });

        const chart = new Chart(ctx, {
            type: 'line', 
            data: {
                labels: labels,
                datasets: [{
                    label: 'Readings',
                    data: data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: backgroundColors,
                    pointBackgroundColor: backgroundColors,
                    borderWidth: 1,
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                
                },
                plugins: {
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: 4,
                                yMax: 4,
                                borderColor: 'rgba(255, 0, 0, 1)', 
                                borderWidth: 2,
                                label: {
                                    content: 'Threshold 4',
                                    enabled: true,
                                    position: 'start',
                                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                                }
                            },
                            line2: {
                                type: 'line',
                                yMin: 11.1,
                                yMax: 11.1,
                                borderColor: 'rgba(255, 0, 0, 1)', 
                                borderWidth: 2,
                                label: {
                                    content: 'Threshold 11.1',
                                    enabled: true,
                                    position: 'start',
                                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                                }
                            },
                        }
                    }
                }
            },
        });
    } catch (error) {
        console.error('Error fetching readings:', error);
    }
}

createChart();
