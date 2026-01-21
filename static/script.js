let currentData = {}; 

const streamConfig = {
    'tech': { l1: "DSA Solved", l2: "Projects", l3: "Hackathons", l4: "Certifications" },
    'bio': { l1: "Lab Hours", l2: "Research Papers", l3: "Conferences", l4: "Certifications" },
    'commerce': { l1: "Finance Skills", l2: "Case Studies", l3: "Internships", l4: "Certifications" },
    'law': { l1: "Legal Research", l2: "Moot Courts", l3: "Case Briefs", l4: "Internships" },
    'arts': { l1: "Portfolio", l2: "Exhibitions", l3: "Projects", l4: "Awards" },
    'other': { l1: "Core Skills", l2: "Projects", l3: "Extracurriculars", l4: "Certifications" }
};

function updateFormFields() {
    const stream = document.getElementById('stream-select').value;
    const config = streamConfig[stream];
    document.getElementById('label-field1').innerText = config.l1;
    document.getElementById('label-field2').innerText = config.l2;
    document.getElementById('label-field3').innerText = config.l3;
    document.getElementById('label-field4').innerText = config.l4;
}

// --- NEW JOB SEARCH LOGIC ---

function openJobModal() {
    document.getElementById('job-search-modal').style.display = 'block';
    resetJobSearch(); // Reset view
}

function closeJobModal() {
    document.getElementById('job-search-modal').style.display = 'none';
}

function resetJobSearch() {
    document.getElementById('job-search-view').classList.remove('hidden');
    document.getElementById('job-results-view').classList.add('hidden');
    document.getElementById('jobs-list').innerHTML = '';
}

async function fetchJobs() {
    const query = document.getElementById('job-role-input').value;
    if(!query) return;

    // Switch views
    document.getElementById('job-search-view').classList.add('hidden');
    document.getElementById('job-results-view').classList.remove('hidden');
    document.getElementById('jobs-loader').classList.remove('hidden');

    try {
        const response = await fetch('/find_jobs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ query: query })
        });
        const data = await response.json();
        
        renderJobs(data.jobs);
    } catch (e) {
        document.getElementById('jobs-list').innerHTML = '<p>Error fetching jobs.</p>';
    } finally {
        document.getElementById('jobs-loader').classList.add('hidden');
    }
}

function renderJobs(jobs) {
    const list = document.getElementById('jobs-list');
    list.innerHTML = '';

    if (!jobs || jobs.length === 0) {
        list.innerHTML = '<p>No specific matches found. Try a different keyword.</p>';
        return;
    }

    jobs.forEach(job => {
        // Construct a smart Google Search URL for redirection
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(job.title + " " + job.company)}&ibp=htl;jobs`;
        
        const card = document.createElement('div');
        card.className = 'job-card';
        // Inline styles for the job card
        card.style.cssText = 'border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 5px; background: #f9f9f9;';
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin:0; color:#333;">${job.title}</h4>
                    <p style="margin:5px 0; font-size:0.9em; color:#666;">
                        <i class="fa-solid fa-building"></i> ${job.company} &bull; 
                        <i class="fa-solid fa-location-dot"></i> ${job.location}
                    </p>
                </div>
                <button onclick="window.open('${searchUrl}', '_blank')" 
                        style="padding:6px 12px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">
                    Apply <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

// --- END JOB LOGIC ---

// Modal Closers
window.onclick = function(event) {
    if (event.target == document.getElementById('chat-modal')) closeChat();
    if (event.target == document.getElementById('job-search-modal')) closeJobModal();
}

// Chat functions
function openChat() { document.getElementById('chat-modal').style.display = 'block'; }
function closeChat() { document.getElementById('chat-modal').style.display = 'none'; }

async function sendChat() {
    const input = document.getElementById('chat-msg');
    const window = document.getElementById('chat-window');
    const msg = input.value;
    if(!msg) return;

    const userDiv = document.createElement('div');
    userDiv.className = 'message user-msg';
    userDiv.innerText = msg;
    window.appendChild(userDiv);
    input.value = "";
    window.scrollTop = window.scrollHeight;

    const res = await fetch('/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: msg})
    });
    const data = await res.json();

    const botDiv = document.createElement('div');
    botDiv.className = 'message bot-msg';
    botDiv.innerText = data.response;
    window.appendChild(botDiv);
    window.scrollTop = window.scrollHeight;
}

// Prediction Form
document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    currentData = {
        stream: document.getElementById('stream-select').value,
        cgpa: document.getElementById('cgpa').value,
        field1: document.getElementById('field1').value,
        field2: document.getElementById('field2').value,
        field3: document.getElementById('field3').value,
        field4: document.getElementById('field4').value
    };
    const response = await fetch('/predict', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(currentData)
    });
    const data = await response.json();
    document.getElementById('initial-state').classList.add('hidden');
    document.getElementById('prediction-result').classList.remove('hidden');
    document.getElementById('score-val').innerText = data.probability + "%";
});

// Improvement Plan
async function getImprovementPlan() {
    const aiSection = document.getElementById('ai-analysis-section');
    aiSection.classList.remove('hidden');
    document.getElementById('ai-content').innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p>Consulting AI Coach...</p></div>';
    aiSection.scrollIntoView({behavior: "smooth"});

    const response = await fetch('/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(currentData)
    });
    const data = await response.json();
    document.getElementById('ai-content').innerHTML = data.analysis;
}