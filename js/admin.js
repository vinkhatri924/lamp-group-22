// ============================================================
// ADMIN PAGE JAVASCRIPT
// ============================================================

let selectedAdminUser = null;


// ------------------------------------------------------------
// LOAD ADMIN PAGE
// ------------------------------------------------------------

window.onload = function()
{
    let userId = sessionStorage.getItem("userId");
    let firstName = sessionStorage.getItem("firstName");
    let lastName = sessionStorage.getItem("lastName");
    let role = sessionStorage.getItem("role");

    // User must be logged in.
    if (userId === null)
    {
        window.location.href = "index.html";
        return;
    }

    // Only Admin users should be on this page.
    if (role !== "Admin")
    {
        window.location.href = "color.html";
        return;
    }

    // Show the Admin's name at the top of the page.
    document.getElementById("adminUserName").textContent =
        "Logged in as " + firstName + " " + lastName;
};


// ------------------------------------------------------------
// LOG OUT
// ------------------------------------------------------------

function adminLogout()
{
    sessionStorage.clear();
    window.location.href = "index.html";
}


// ------------------------------------------------------------
// SEARCH USERS
// ------------------------------------------------------------

async function adminSearchUsers()
{
    let searchText =
        document.getElementById("userSearchText").value.trim();

    let message =
        document.getElementById("userSearchMessage");

    let results =
        document.getElementById("userSearchResults");

    // Clear old results.
    message.textContent = "";
    results.innerHTML = "";

    let token = sessionStorage.getItem("token");

    try
    {
        // Blank search is allowed and will return all users.
        let url =
            "/api/index.php?action=adminUsers&q=" +
            encodeURIComponent(searchText);

        let response = await fetch(url,
        {
            method: "GET",

            headers:
            {
                "Authorization": "Bearer " + token
            }
        });

        let data = await response.json();

        if (!response.ok)
        {
            message.textContent =
                data.error || "Unable to search users.";

            return;
        }

        if (!data.users || data.users.length === 0)
        {
            message.textContent = "No users found.";
            return;
        }

        message.textContent =
            data.users.length + " user(s) found.";

        // Display every returned user.
        data.users.forEach(function(user)
        {
            displayAdminUser(user);
        });
    }
    catch (error)
    {
        console.error(error);

        message.textContent =
            "Unable to connect to the server.";
    }
}


// ------------------------------------------------------------
// DISPLAY ONE USER SEARCH RESULT
// ------------------------------------------------------------

function displayAdminUser(user)
{
    let results =
        document.getElementById("userSearchResults");

    let card = document.createElement("div");
    card.className = "user-result";

    let name = document.createElement("h3");
    name.textContent =
        user.firstName + " " + user.lastName;

    let username = document.createElement("p");
    username.textContent =
        "Username: " + user.username;

    let role = document.createElement("p");
    role.textContent =
        "Role: " + user.role;

    let status = document.createElement("p");

    if (Number(user.isDisabled) === 1)
    {
        status.textContent = "Status: Disabled";
    }
    else
    {
        status.textContent = "Status: Active";
    }

    let selectButton = document.createElement("button");

    selectButton.textContent = "Manage User";
    selectButton.className = "primary-button";

    selectButton.onclick = function()
    {
        selectAdminUser(user);
    };

    card.appendChild(name);
    card.appendChild(username);
    card.appendChild(role);
    card.appendChild(status);
    card.appendChild(selectButton);

    results.appendChild(card);
}


// ------------------------------------------------------------
// SELECT A USER TO MANAGE
// ------------------------------------------------------------

function selectAdminUser(user)
{
    selectedAdminUser = user;

    document.getElementById("selectedUserId").value =
        user.id;

    document.getElementById("selectedUserName").textContent =
        user.firstName + " " + user.lastName;

    document.getElementById("selectedUsername").textContent =
        user.username;

    document.getElementById("selectedUserRole").textContent =
        user.role;

    if (Number(user.isDisabled) === 1)
    {
        document.getElementById("selectedUserStatus").textContent =
            "Disabled";
    }
    else
    {
        document.getElementById("selectedUserStatus").textContent =
            "Active";
    }

    // Reveal the Selected User section.
    document.getElementById("selectedUserSection").style.display =
        "block";

    document.getElementById("selectedUserMessage").textContent =
        "";
}


// ------------------------------------------------------------
// THESE FUNCTIONS WILL BE CONNECTED NEXT
// ------------------------------------------------------------

function adminViewUserContacts()
{
    document.getElementById("selectedUserMessage").textContent =
        "View Contacts will be connected next.";
}


function adminChangePassword()
{
    document.getElementById("selectedUserMessage").textContent =
        "Change Password will be connected next.";
}


function adminDisableUser()
{
    document.getElementById("selectedUserMessage").textContent =
        "Disable User will be connected next.";
}


function adminSearchContacts()
{
    document.getElementById("contactSearchMessage").textContent =
        "Search All Contacts will be connected next.";
}


// ------------------------------------------------------------
// CREATE ADMIN ACCOUNT
// ------------------------------------------------------------
async function adminCreateAccount()
{
    let firstName =
        document.getElementById("newAdminFirstName").value.trim();

    let lastName =
        document.getElementById("newAdminLastName").value.trim();

    let username =
        document.getElementById("newAdminUsername").value.trim();

    let password =
        document.getElementById("newAdminPassword").value;

    let result =
        document.getElementById("createAdminResult");

    result.textContent = "";

    if (firstName === "" ||
        lastName === "" ||
        username === "" ||
        password === "")
    {
        result.textContent = "Please complete all fields.";
        return;
    }

    let token = sessionStorage.getItem("token");

    try
    {
        let response = await fetch(
            "/api/index.php?action=adminCreateAccount",
            {
                method: "POST",

                headers:
                {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },

                body: JSON.stringify(
                {
                    firstName: firstName,
                    lastName: lastName,
                    username: username,
                    password: password,
                    role: "Admin"
                })
            }
        );

        let data = await response.json();

        if (!response.ok)
        {
            result.textContent =
                data.error || "Unable to create Admin account.";
            return;
        }

        result.textContent =
            "Admin account created successfully!";

        document.getElementById("newAdminFirstName").value = "";
        document.getElementById("newAdminLastName").value = "";
        document.getElementById("newAdminUsername").value = "";
        document.getElementById("newAdminPassword").value = "";
    }
    catch (error)
    {
        console.error(error);

        result.textContent =
            "Unable to connect to the server.";
    }
}
