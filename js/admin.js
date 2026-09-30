// ============================================================
// ADMIN PAGE JAVASCRIPT
// ============================================================

let selectedAdminUser = null;


// ------------------------------------------------------------
// PAGE LOAD / AUTHENTICATION
// ------------------------------------------------------------

window.onload = function()
{
    let userId = sessionStorage.getItem("userId");
    let firstName = sessionStorage.getItem("firstName") || "";
    let lastName = sessionStorage.getItem("lastName") || "";
    let role = sessionStorage.getItem("role");

    // User must be logged in.
    if (!userId)
    {
        window.location.href = "index.html";
        return;
    }

    // Only Admin users should access this page.
    if (role !== "Admin")
    {
        window.location.href = "color.html";
        return;
    }

    document.getElementById("adminUserName").textContent =
        "Logged in as " + firstName + " " + lastName;
};


// ------------------------------------------------------------
// CREATE HEADERS FOR ADMIN API REQUESTS
// ------------------------------------------------------------

function getAdminHeaders(includeJson = false)
{
    let headers =
    {
        "Authorization":
            "Bearer " + sessionStorage.getItem("token")
    };

    if (includeJson)
    {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}


// ------------------------------------------------------------
// SAFELY READ JSON FROM API
// ------------------------------------------------------------

async function getJsonResponse(response)
{
    let text = await response.text();

    if (text === "")
    {
        return {};
    }

    try
    {
        return JSON.parse(text);
    }
    catch (error)
    {
        console.error("Server returned:", text);

        throw new Error(
            "Server returned an invalid response."
        );
    }
}


// ------------------------------------------------------------
// LOG OUT
// ------------------------------------------------------------

function adminLogout()
{
    sessionStorage.clear();
    window.location.href = "index.html";
}


// ============================================================
// SEARCH USERS
// ============================================================

async function adminSearchUsers()
{
    let searchText =
        document.getElementById("userSearchText").value.trim();

    let message =
        document.getElementById("userSearchMessage");

    let results =
        document.getElementById("userSearchResults");

    message.textContent = "Searching...";
    results.innerHTML = "";

    // Close any previously selected user when starting a new search.
    document.getElementById("selectedUserSection").style.display = "none";
    document.getElementById("selectedUserContacts").innerHTML = "";
    document.getElementById("selectedUserMessage").textContent = "";

    selectedAdminUser = null;

    try
    {
        // Blank search returns all users.
        let response = await fetch(
            "/api/index.php?action=adminUsers&q=" +
            encodeURIComponent(searchText),
            {
                method: "GET",
                headers: getAdminHeaders()
            }
        );

        let data = await getJsonResponse(response);

        if (!response.ok)
        {
            message.textContent =
                data.error || "Unable to search users.";

            return;
        }

        let users = data.users || [];

        if (users.length === 0)
        {
            message.textContent = "No users found.";
            return;
        }

        message.textContent =
            users.length + " user(s) found.";

        users.forEach(function(user)
        {
            displayAdminUser(user);
        });
    }
    catch (error)
    {
        console.error(error);

        message.textContent =
            error.message || "Unable to connect to the server.";
    }
}


// ------------------------------------------------------------
// DISPLAY USER SEARCH RESULT
// ------------------------------------------------------------

function displayAdminUser(user)
{
    let results =
        document.getElementById("userSearchResults");

    let card =
        document.createElement("div");

    card.className = "user-result";

    let name =
        document.createElement("h3");

    name.textContent =
        user.firstName + " " + user.lastName;


    let username =
        document.createElement("p");

    username.textContent =
        "Username: " + user.username;


    let role =
        document.createElement("p");

    role.textContent =
        "Role: " + user.role;


    let status =
        document.createElement("p");

    status.textContent =
        user.isDisabled
        ? "Status: Disabled"
        : "Status: Active";


    let button =
        document.createElement("button");

    button.textContent = "Manage User";
    button.className = "primary-button";

    button.onclick = function()
    {
        selectAdminUser(user);
    };


    card.appendChild(name);
    card.appendChild(username);
    card.appendChild(role);
    card.appendChild(status);
    card.appendChild(button);

    results.appendChild(card);
}


// ============================================================
// SELECT USER TO MANAGE
// ============================================================

function selectAdminUser(user)
{
    let section =
        document.getElementById("selectedUserSection");

    // If this same user is already selected and the section
    // is open, clicking Manage User again will close it.
    if (selectedAdminUser !== null &&
        selectedAdminUser.id == user.id &&
        section.style.display === "block")
    {
        section.style.display = "none";

        document.getElementById("selectedUserContacts").innerHTML = "";
        document.getElementById("selectedUserMessage").textContent = "";

        selectedAdminUser = null;

        return;
    }

    // Otherwise, select the user and open the section.
    selectedAdminUser = user;

    document.getElementById("selectedUserId").value =
        user.id;

    document.getElementById("selectedUserName").textContent =
        user.firstName + " " + user.lastName;

    document.getElementById("selectedUsername").textContent =
        user.username;

    document.getElementById("selectedUserRole").textContent =
        user.role;

    document.getElementById("selectedUserStatus").textContent =
        user.isDisabled
        ? "Disabled"
        : "Active";

    let disableButton =
        document.getElementById("disableUserButton");

    if (disableButton)
    {
        disableButton.textContent =
            user.isDisabled
            ? "Enable User"
            : "Disable User";
    }

    // Clear information from the previously selected user.
    document.getElementById("selectedUserMessage").textContent = "";
    document.getElementById("selectedUserContacts").innerHTML = "";

    document.getElementById("changePasswordSection").style.display = "none";
    document.getElementById("userStatusConfirmSection").style.display = "none";

    // Show management options.
    section.style.display = "block";
}

// ============================================================
// VIEW SELECTED USER'S CONTACTS
// ============================================================

async function adminViewUserContacts()
{
    if (!selectedAdminUser)
    {
        return;
    }

    let message =
        document.getElementById("selectedUserMessage");

    let results =
        document.getElementById("selectedUserContacts");

    message.textContent = "Loading contacts...";
    results.innerHTML = "";

    try
    {
        let response = await fetch(
            "/api/index.php?action=adminUserContacts&userId=" +
            encodeURIComponent(selectedAdminUser.id),
            {
                method: "GET",
                headers: getAdminHeaders()
            }
        );

        let data = await getJsonResponse(response);

        if (!response.ok)
        {
            message.textContent =
                data.error || "Unable to load contacts.";

            return;
        }

        let contacts =
            data.contacts || [];

        if (contacts.length === 0)
        {
            message.textContent =
                "This user has no contacts.";

            return;
        }

        message.textContent =
            contacts.length + " contact(s) found.";

        contacts.forEach(function(contact)
        {
            let card =
                document.createElement("div");

            card.className = "contact-result";


            let name =
                document.createElement("h3");

            name.textContent =
                contact.name;


            let phone =
                document.createElement("p");

            phone.textContent =
                "Phone: " + (contact.phone || "N/A");


            let email =
                document.createElement("p");

            email.textContent =
                "Email: " + (contact.email || "N/A");


            let category =
                document.createElement("p");

            category.textContent =
                "Category: " +
                (contact.category || "Other");


            card.appendChild(name);
            card.appendChild(phone);
            card.appendChild(email);
            card.appendChild(category);

            results.appendChild(card);
        });
    }
    catch (error)
    {
        console.error(error);

        message.textContent =
            error.message || "Unable to connect to the server.";
    }
}


// ============================================================
// CHANGE USER PASSWORD
// ============================================================

// ============================================================
// SHOW CHANGE PASSWORD FORM
// ============================================================

function showChangePasswordForm()
{
    if (!selectedAdminUser)
    {
        return;
    }

    // Hide the enable/disable confirmation if it is open.
    document.getElementById("userStatusConfirmSection").style.display =
        "none";

    // Clear old password values and messages.
    document.getElementById("adminNewPassword").value = "";
    document.getElementById("adminConfirmPassword").value = "";

    document.getElementById("selectedUserMessage").textContent = "";

    // Show the password form.
    document.getElementById("changePasswordSection").style.display =
        "block";
}


// ============================================================
// CANCEL PASSWORD CHANGE
// ============================================================

function cancelChangePassword()
{
    document.getElementById("changePasswordSection").style.display =
        "none";

    document.getElementById("adminNewPassword").value = "";
    document.getElementById("adminConfirmPassword").value = "";

    document.getElementById("selectedUserMessage").textContent = "";
}


// ============================================================
// CHANGE USER PASSWORD
// ============================================================

async function adminChangePassword()
{
    if (!selectedAdminUser)
    {
        return;
    }

    let newPassword =
        document.getElementById("adminNewPassword").value.trim();

    let confirmPassword =
        document.getElementById("adminConfirmPassword").value.trim();

    let message =
        document.getElementById("selectedUserMessage");

    if (newPassword === "")
    {
        message.textContent =
            "Please enter a new password.";

        return;
    }

    if (newPassword !== confirmPassword)
    {
        message.textContent =
            "Passwords do not match.";

        return;
    }

    try
    {
        let response = await fetch(
            "/api/index.php?action=adminChangePassword",
            {
                method: "POST",

                headers: getAdminHeaders(true),

                body: JSON.stringify(
                {
                    userId: selectedAdminUser.id,
                    newPassword: newPassword
                })
            }
        );

        let data = await getJsonResponse(response);

        if (!response.ok)
        {
            message.textContent =
                data.error || "Unable to change password.";

            return;
        }

        message.textContent =
            "Password changed successfully.";

        document.getElementById("changePasswordSection").style.display =
            "none";

        document.getElementById("adminNewPassword").value = "";
        document.getElementById("adminConfirmPassword").value = "";
    }
    catch (error)
    {
        console.error(error);

        message.textContent =
            error.message || "Unable to connect to the server.";
    }
}


// ============================================================
// DISABLE / ENABLE USER
// ============================================================

// ============================================================
// SHOW ENABLE / DISABLE CONFIRMATION
// ============================================================

function showDisableConfirmation()
{
    if (!selectedAdminUser)
    {
        return;
    }

    // Hide password form if it is open.
    document.getElementById("changePasswordSection").style.display =
        "none";

    let isDisabled =
        selectedAdminUser.isDisabled === true ||
        Number(selectedAdminUser.isDisabled) === 1;

    let shouldDisable = !isDisabled;

    let text =
        document.getElementById("userStatusConfirmText");

    let button =
        document.getElementById("confirmUserStatusButton");

    if (shouldDisable)
    {
        text.textContent =
            "Disable " + selectedAdminUser.username + "?";

        button.textContent =
            "Confirm Disable";
    }
    else
    {
        text.textContent =
            "Enable " + selectedAdminUser.username + "?";

        button.textContent =
            "Confirm Enable";
    }

    document.getElementById("selectedUserMessage").textContent = "";

    document.getElementById("userStatusConfirmSection").style.display =
        "block";
}


// ============================================================
// CANCEL ENABLE / DISABLE
// ============================================================

function cancelUserStatusChange()
{
    document.getElementById("userStatusConfirmSection").style.display =
        "none";

    document.getElementById("selectedUserMessage").textContent = "";
}


// ============================================================
// DISABLE / ENABLE USER
// ============================================================

async function adminDisableUser()
{
    if (!selectedAdminUser)
    {
        return;
    }

    let isDisabled =
        selectedAdminUser.isDisabled === true ||
        Number(selectedAdminUser.isDisabled) === 1;

    let shouldDisable = !isDisabled;

    let message =
        document.getElementById("selectedUserMessage");

    try
    {
        let response = await fetch(
            "/api/index.php?action=adminDisableUser",
            {
                method: "POST",

                headers: getAdminHeaders(true),

                body: JSON.stringify(
                {
                    userId: selectedAdminUser.id,
                    isDisabled: shouldDisable
                })
            }
        );

        let data = await getJsonResponse(response);

        if (!response.ok)
        {
            message.textContent =
                data.error || "Unable to update user status.";

            return;
        }

        selectedAdminUser.isDisabled =
            shouldDisable;

        document.getElementById("selectedUserStatus").textContent =
            shouldDisable ? "Disabled" : "Active";

        let disableButton =
            document.getElementById("disableUserButton");

        disableButton.textContent =
            shouldDisable ? "Enable User" : "Disable User";

        message.textContent =
            shouldDisable
            ? "User disabled successfully."
            : "User enabled successfully.";

        document.getElementById("userStatusConfirmSection").style.display =
            "none";

        await adminSearchUsers();
    }
    catch (error)
    {
        console.error(error);

        message.textContent =
            error.message || "Unable to connect to the server.";
    }
}


// ============================================================
// SEARCH ALL CONTACTS
// ============================================================

async function adminSearchContacts()
{
    let searchText =
        document.getElementById(
            "adminContactSearchText"
        ).value.trim();

    let message =
        document.getElementById(
            "contactSearchMessage"
        );

    let results =
        document.getElementById(
            "adminContactResults"
        );

    message.textContent =
        "Searching...";

    results.innerHTML = "";

    try
    {
        // Blank search returns every contact.
        let response = await fetch(
            "/api/index.php?action=adminContacts&q=" +
            encodeURIComponent(searchText),
            {
                method: "GET",
                headers: getAdminHeaders()
            }
        );

        let data =
            await getJsonResponse(response);

        if (!response.ok)
        {
            message.textContent =
                data.error ||
                "Unable to search contacts.";

            return;
        }

        let contacts =
            data.contacts || [];

        if (contacts.length === 0)
        {
            message.textContent =
                "No contacts found.";

            return;
        }

        message.textContent =
            contacts.length +
            " contact(s) found.";


        contacts.forEach(function(contact)
        {
            let card =
                document.createElement("div");

            card.className =
                "contact-result";


            let name =
                document.createElement("h3");

            name.textContent =
                contact.name;


            let owner =
                document.createElement("p");

            owner.textContent =
                "Owner: " + contact.owner;


            let phone =
                document.createElement("p");

            phone.textContent =
                "Phone: " +
                (contact.phone || "N/A");


            let email =
                document.createElement("p");

            email.textContent =
                "Email: " +
                (contact.email || "N/A");


            let category =
                document.createElement("p");

            category.textContent =
                "Category: " +
                (contact.category || "Other");


            card.appendChild(name);
            card.appendChild(owner);
            card.appendChild(phone);
            card.appendChild(email);
            card.appendChild(category);

            results.appendChild(card);
        });
    }
    catch (error)
    {
        console.error(error);

        message.textContent =
            error.message ||
            "Unable to connect to the server.";
    }
}


// ============================================================
// CREATE ADMIN ACCOUNT
// ============================================================

async function adminCreateAccount()
{
    let firstName =
        document.getElementById(
            "newAdminFirstName"
        ).value.trim();

    let lastName =
        document.getElementById(
            "newAdminLastName"
        ).value.trim();

    let username =
        document.getElementById(
            "newAdminUsername"
        ).value.trim();

    let password =
        document.getElementById(
            "newAdminPassword"
        ).value;

    let result =
        document.getElementById(
            "createAdminResult"
        );

    result.textContent = "";


    if (firstName === "" ||
        lastName === "" ||
        username === "" ||
        password === "")
    {
        result.textContent =
            "Please complete all fields.";

        return;
    }


    try
    {
        let response = await fetch(
            "/api/index.php?action=adminCreateAccount",
            {
                method: "POST",

                headers:
                    getAdminHeaders(true),

                body: JSON.stringify(
                {
                    firstName: firstName,
                    lastName: lastName,
                    username: username,
                    password: password,

                    // This is what makes the
                    // new account an Admin.
                    role: "Admin"
                })
            }
        );

        let data =
            await getJsonResponse(response);

        if (!response.ok)
        {
            result.textContent =
                data.error ||
                "Unable to create Admin account.";

            return;
        }


        result.textContent =
            "Admin account created successfully!";


        // Clear the form.
        document.getElementById(
            "newAdminFirstName"
        ).value = "";

        document.getElementById(
            "newAdminLastName"
        ).value = "";

        document.getElementById(
            "newAdminUsername"
        ).value = "";

        document.getElementById(
            "newAdminPassword"
        ).value = "";
    }
    catch (error)
    {
        console.error(error);

        result.textContent =
            error.message ||
            "Unable to connect to the server.";
    }
}