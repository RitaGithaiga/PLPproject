document.addEventListener('DOMContentLoaded', () => {

    const today = new Date();
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    document.getElementById('date').value = today.toLocaleDateString('en-CA', options);

    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    document.getElementById('time').value = `${hours}:${minutes}`;

    // Handle form submission
    const form = document.getElementById('new-record');
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const formData = new FormData(form);
        const date = formData.get('date');
        const time = formData.get('time');
        const recording = formData.get('recording');
        const units = formData.get('units');

 //notifications
     let message = '';
     if (recording < 4) {
         message = 'Your blood sugar is too low';
     } else if (recording > 11.1) {
         message = 'Your blood sugar is high';
     }

     if (message) {
         alert(message);
     }

        try {
            const response = await fetch('/new_record', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date, time, recording, units })
            });

            if (response.ok) {
                alert('New record saved!');

                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                const error = await response.json();
                alert('Error: ' + error.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while saving the record.');
        }
    });
});
