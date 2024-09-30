document.addEventListener('DOMContentLoaded', () => {
    const filterForm = document.getElementById('filter-form');
    const tableBody = document.querySelector('#summary-table tbody');

    function addRow(recording) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${recording.date}</td>
            <td>${recording.time}</td>
            <td>${parseFloat(recording.recording).toFixed(2)}</td>
            <td>${recording.units}</td>
            <td><button class="delete-button" data-id="${recording.recordId}">Delete</button></td>
        `;
        tableBody.appendChild(row);
    }

    filterForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        const date = filterForm['filter-date'].value;

        const response = await fetch(`/summaries?date=${date}`);
        if (response.ok) {
            const recordings = await response.json();
            tableBody.innerHTML = ''; 
            recordings.forEach(addRow);
        } else {
            console.error('Failed to fetch recording');
        }
    });

    (async function loadInitialRecording() {
        const response = await fetch('/summaries');
        if (response.ok) {
            const recordings = await response.json();
            recordings.forEach(addRow);
        } else {
            console.error('Failed to fetch initial recording');
        }
    })();

    tableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-button')) {
            const recordId = event.target.dataset.id;

            // Confirm deletion
            if (confirm('Are you sure you want to delete this record?')) {
                const response = await fetch(`/delete_record/${recordId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    event.target.closest('tr').remove();
                    console.log('Record deleted successfully');
                } else {
                    const errorMessage = await response.text();
                    console.error('Failed to delete record:', errorMessage);
                    alert(`Error: ${errorMessage}`);
                }
            }
        }
    });
});
