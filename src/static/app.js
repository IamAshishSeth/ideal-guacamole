document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helpers to safely render participant names/emails
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function participantDisplay(p) {
    if (!p) return "";
    if (typeof p === "string") return escapeHtml(p);
    if (typeof p === "object") {
      if (p.name && p.email) return escapeHtml(`${p.name} (${p.email})`);
      if (p.name) return escapeHtml(p.name);
      if (p.email) return escapeHtml(p.email);
      return escapeHtml(JSON.stringify(p));
    }
    return escapeHtml(String(p));
  }
  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        // mark card with activity name and max participants for easy lookup
        activityCard.dataset.activity = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section (bulleted list)

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const participantsHTML = (participants.length
          ? `<ul class="participants-list">${participants
              .map((p) => {
                // Determine displayed text and email for data attribute
                const display = (typeof p === "string") ? participantDisplay(p) : participantDisplay(p);
                const email = (typeof p === "string") ? p : (p && p.email) ? p.email : "";
                const disabledAttr = email ? "" : "disabled";
                return `<li class="participant-item" data-email="${escapeHtml(email)}">
                          <span class="participant-name">${display}</span>
                          <button class="participant-remove" ${disabledAttr} title="Remove participant">×</button>
                        </li>`
              })
              .join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`);

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            ${participantsHTML}
          </div>
        `;

        // Attach remove handlers for participant buttons inside this card
        const removeButtons = activityCard.querySelectorAll(".participant-remove");
        removeButtons.forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.preventDefault();
            const li = btn.closest('.participant-item');
            if (!li) return;
            const email = li.getAttribute('data-email');
            if (!email) return;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`, {
                method: 'DELETE'
              });

              const result = await resp.json().catch(() => ({}));

              if (resp.ok) {
                // Remove participant from DOM
                li.remove();
                // Update availability count using dataset maxParticipants
                const availabilityP = activityCard.querySelector('.availability');
                if (availabilityP) {
                  const max = parseInt(activityCard.dataset.maxParticipants, 10) || details.max_participants;
                  const remaining = Math.max(0, max - activityCard.querySelectorAll('.participant-item').length);
                  availabilityP.innerHTML = `<strong>Availability:</strong> ${remaining} spots left`;
                }

                messageDiv.textContent = result.message || `Removed ${email}`;
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              } else {
                messageDiv.textContent = result.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to remove participant';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 4000);
            }
          });
        });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Update the activity card DOM so new participant appears without refresh
        (function addParticipantToCard() {
          const activityName = activity;
          // find the card by matching its h4 text
          let card = null;
          Array.from(activitiesList.children).forEach((c) => {
            const h = c.querySelector('h4');
            if (h && h.textContent === activityName) card = c;
          });

          if (!card) return;

          let ul = card.querySelector('.participants-list');
          const wrapper = card.querySelector('.participants');
          // if no list exists yet, remove placeholder and create one
          if (!ul) {
            const noP = card.querySelector('.no-participants');
            if (noP) noP.remove();
            ul = document.createElement('ul');
            ul.className = 'participants-list';
            wrapper.appendChild(ul);
          }

          // create new list item
          const li = document.createElement('li');
          li.className = 'participant-item';
          li.setAttribute('data-email', email);
          const span = document.createElement('span');
          span.className = 'participant-name';
          span.textContent = participantDisplay(email);
          const btn = document.createElement('button');
          btn.className = 'participant-remove';
          btn.title = 'Remove participant';
          btn.textContent = '×';
          li.appendChild(span);
          li.appendChild(btn);
          ul.appendChild(li);

          // update availability using data-maxParticipants
          const availabilityP = card.querySelector('.availability');
          if (availabilityP) {
            const max = parseInt(card.dataset.maxParticipants, 10) || 0;
            const remaining = Math.max(0, max - card.querySelectorAll('.participant-item').length);
            availabilityP.innerHTML = `<strong>Availability:</strong> ${remaining} spots left`;
          }

          // attach remove handler to the new button
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const liEl = btn.closest('.participant-item');
            if (!liEl) return;
            const eEmail = liEl.getAttribute('data-email');
            if (!eEmail) return;
            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(eEmail)}`, { method: 'DELETE' });
              const resJson = await resp.json().catch(() => ({}));
              if (resp.ok) {
                liEl.remove();
                if (availabilityP) {
                  const max2 = parseInt(card.dataset.maxParticipants, 10) || 0;
                  const remaining2 = Math.max(0, max2 - card.querySelectorAll('.participant-item').length);
                  availabilityP.innerHTML = `<strong>Availability:</strong> ${remaining2} spots left`;
                }
                messageDiv.textContent = resJson.message || `Removed ${eEmail}`;
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              } else {
                messageDiv.textContent = resJson.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to remove participant';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 4000);
            }
          });
        })();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
