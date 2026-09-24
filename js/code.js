// --------------------------------------------------
// LOGIN
// --------------------------------------------------

function doLogin()
{
    let login = document.getElementById("loginName").value.trim();
    let password = document.getElementById("loginPassword").value.trim();
    let result = document.getElementById("loginResult");

    result.innerHTML = "";

    if (login === "" || password === "")
    {
        result.innerHTML = "Please enter a username and password.";
        return;
    }

    fetch("/api/index.php",
    {
        method: "POST",
        headers:
        {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(
        {
            login: login,
            password: password
        })
    })

    .then(response =>
    {
        return response.json().then(data =>
        {
            return {
                ok: response.ok,
                data: data
            };
        });
    })

    .then(resultData =>
    {
        let data = resultData.data;

        if (resultData.ok && data.id > 0)
        {
            sessionStorage.setItem("userId", data.id);
            sessionStorage.setItem("firstName", data.firstName);
            sessionStorage.setItem("lastName", data.lastName);
            sessionStorage.setItem("token", data.token);

            window.location.href = "color.html";
        }
        else
        {
            result.innerHTML =
                data.error || "Invalid username or password.";
        }
    })

    .catch(error =>
    {
        console.error(error);
        result.innerHTML = "Unable to connect to the server.";
    });
}

// --------------------------------------------------
// SHOW / HIDE REGISTER FORM
// --------------------------------------------------

function toggleRegister()
{
    let section = document.getElementById("registerSection");

    if (section.style.display === "block")
    {
        section.style.display = "none";
    }
    else
    {
        section.style.display = "block";
    }
}


// --------------------------------------------------
// REGISTER
// --------------------------------------------------

function doRegister()
{
    let firstName =
        document.getElementById("registerFirstName").value.trim();

    let lastName =
        document.getElementById("registerLastName").value.trim();

    let username =
        document.getElementById("registerUsername").value.trim();

    let password =
        document.getElementById("registerPassword").value.trim();

    let confirmPassword =
        document.getElementById("registerConfirmPassword").value.trim();

    let result =
        document.getElementById("registerResult");

    result.innerHTML = "";

    if (firstName === "" ||
        lastName === "" ||
        username === "" ||
        password === "")
    {
        result.innerHTML = "Please complete all fields.";
        return;
    }

    if (password !== confirmPassword)
    {
        result.innerHTML = "Passwords do not match.";
        return;
    }

    fetch("/api/index.php?action=register",
    {
        method: "POST",

        headers:
        {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(
        {
            firstName: firstName,
            lastName: lastName,
            username: username,
            password: password
        })
    })

    .then(response =>
    {
        return response.json().then(data =>
        {
            return {
                ok: response.ok,
                data: data
            };
        });
    })

    .then(resultData =>
    {
        let data = resultData.data;

        if (resultData.ok)
        {
            result.style.color = "green";
            result.innerHTML =
                data.message || "Registration successful!";

            // Put the new username into the login box.
            document.getElementById("loginName").value = username;

            // Clear registration fields.
            document.getElementById("registerFirstName").value = "";
            document.getElementById("registerLastName").value = "";
            document.getElementById("registerUsername").value = "";
            document.getElementById("registerPassword").value = "";
            document.getElementById("registerConfirmPassword").value = "";
        }
        else
        {
            result.style.color = "red";
            result.innerHTML =
                data.error || "Registration failed.";
        }
    })

    .catch(error =>
    {
        console.error(error);

        result.style.color = "red";
        result.innerHTML =
            "Unable to connect to the server.";
    });
}

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

function doLogout()
{
    sessionStorage.clear();
    window.location.href = "index.html";
}


// --------------------------------------------------
// LOAD USER
// --------------------------------------------------

function loadUser()
{
    let userId = sessionStorage.getItem("userId");
    let firstName = sessionStorage.getItem("firstName");
    let lastName = sessionStorage.getItem("lastName");

    if (userId === null)
    {
        window.location.href = "index.html";
        return;
    }

    let display = document.getElementById("userName");

    if (display !== null)
    {
        display.innerHTML =
            "Logged in as " + firstName + " " + lastName;
    }
}


// --------------------------------------------------
// CONTACT CATEGORY
// --------------------------------------------------

let selectedCategory = "All Contacts";

function selectCategory(category, color)
{
    selectedCategory = category;

    let info = document.getElementById("categoryInfo");

    if (info !== null)
    {
        info.innerHTML =
            "<strong>Selected Category:</strong> " + category;

        info.style.backgroundColor = color;
    }
}

// --------------------------------------------------
// PHONE / EMAIL N/A OPTION
// --------------------------------------------------

function toggleContactField(fieldId, status)
{
    let field = document.getElementById(fieldId);

    if (status === "na")
    {
        field.value = "N/A";
        field.disabled = true;
    }
    else
    {
        field.disabled = false;

        if (field.value === "N/A")
        {
            field.value = "";
        }
    }
}


// --------------------------------------------------
// SEARCH CONTACT
// --------------------------------------------------

function searchContact()
{
    let searchText =
        document.getElementById("searchText").value.trim();

    let message =
        document.getElementById("searchMessage");

    let results =
        document.getElementById("searchResults");

    message.innerHTML = "";
    results.innerHTML = "";

    /*
        API CONNECTION GOES HERE.

        The API teammate needs to provide:
        - Search endpoint
        - HTTP method
        - Query parameter names
        - JSON response format

        Example future result:
        displayContactResults(data.contacts);
    */

    message.innerHTML =
        "Contact search is ready to connect to the API.";
}


// --------------------------------------------------
// DISPLAY SEARCH RESULTS
// --------------------------------------------------

function displayContactResults(contacts)
{
    let results = document.getElementById("searchResults");
    let message = document.getElementById("searchMessage");

    results.innerHTML = "";

    if (!contacts || contacts.length === 0)
    {
        message.innerHTML = "No contacts found.";
        return;
    }

    message.innerHTML =
        contacts.length + " contact(s) found.";

    contacts.forEach(function(contact)
    {
        let item = document.createElement("div");

        item.className = "contact-result";

        item.innerHTML =
            "<strong>" + contact.name + "</strong><br>" +
            "Phone: " + contact.phone + "<br>" +
            "Email: " + contact.email + "<br>" +
            "Category: " + contact.category;

        item.onclick = function()
        {
            openEditContact(contact);
        };

        results.appendChild(item);
    });
}


// --------------------------------------------------
// ADD CONTACT
// --------------------------------------------------

function addContact()
{
    let name =
        document.getElementById("contactName").value.trim();

    let phone =
        document.getElementById("contactPhone").value.trim();

    let email =
        document.getElementById("contactEmail").value.trim();

    let category =
        document.getElementById("contactCategory").value;

    let result =
        document.getElementById("addResult");

    if (document.getElementById("phoneStatus").value === "na")
    {
        phone = "N/A";
    }

    if (document.getElementById("emailStatus").value === "na")
    {
        email = "N/A";
    }

    if (name === "")
    {
        result.innerHTML = "Please enter a contact name.";
        return;
    }

    /*
        API CONNECTION GOES HERE.

        Send:
        name
        phone
        email
        category
        logged-in user ID/token
    */

    result.innerHTML =
        "Add Contact is ready to connect to the API.";
}

// --------------------------------------------------
// CONTACT ADDED SUCCESS
// --------------------------------------------------

function contactAddedSuccess()
{
    alert("Contact added successfully!");

    clearAddContactForm();
}


// --------------------------------------------------
// CLEAR ADD CONTACT FORM
// --------------------------------------------------

function clearAddContactForm()
{
    document.getElementById("contactName").value = "";

    document.getElementById("contactPhone").value = "";
    document.getElementById("contactPhone").disabled = false;

    document.getElementById("contactEmail").value = "";
    document.getElementById("contactEmail").disabled = false;

    document.getElementById("phoneStatus").value = "available";
    document.getElementById("emailStatus").value = "available";

    document.getElementById("contactCategory").value = "Family";

    let result = document.getElementById("addResult");

    if (result !== null)
    {
        result.innerHTML = "";
    }
}

// --------------------------------------------------
// OPEN EDIT CONTACT
// --------------------------------------------------

function openEditContact(contact)
{
    let editSection =
        document.getElementById("editSection");

    document.getElementById("editContactId").value =
        contact.id;

    document.getElementById("editName").value =
        contact.name;

    document.getElementById("editCategory").value =
        contact.category;

    if (!contact.phone || contact.phone === "N/A")
    {
        document.getElementById("editPhone").value = "N/A";
        document.getElementById("editPhone").disabled = true;
        document.getElementById("editPhoneStatus").value = "na";
    }
    else
    {
        document.getElementById("editPhone").value =
            contact.phone;

        document.getElementById("editPhone").disabled = false;
        document.getElementById("editPhoneStatus").value = "available";
    }

    if (!contact.email || contact.email === "N/A")
    {
        document.getElementById("editEmail").value = "N/A";
        document.getElementById("editEmail").disabled = true;
        document.getElementById("editEmailStatus").value = "na";
    }
    else
    {
        document.getElementById("editEmail").value =
            contact.email;

        document.getElementById("editEmail").disabled = false;
        document.getElementById("editEmailStatus").value = "available";
    }

    document.getElementById("addSection").style.display = "none";

    editSection.style.display = "block";
}


// --------------------------------------------------
// CLOSE EDIT CONTACT
// --------------------------------------------------

function closeEditContact()
{
    document.getElementById("editSection").style.display = "none";
    document.getElementById("editResult").innerHTML = "";
}


// --------------------------------------------------
// UPDATE CONTACT
// --------------------------------------------------

function updateContact()
{
    let id =
        document.getElementById("editContactId").value;

    let name =
        document.getElementById("editName").value.trim();

    let phone =
        document.getElementById("editPhone").value.trim();

    let email =
        document.getElementById("editEmail").value.trim();

    let category =
        document.getElementById("editCategory").value;

    let result =
        document.getElementById("editResult");

    if (document.getElementById("editPhoneStatus").value === "na")
    {
        phone = "N/A";
    }

    if (document.getElementById("editEmailStatus").value === "na")
    {
        email = "N/A";
    }

    if (name === "")
    {
        result.innerHTML = "Please enter a contact name.";
        return;
    }

    /*
        API CONNECTION GOES HERE.

        Send:
        contact ID
        name
        phone
        email
        category
    */

    result.innerHTML =
        "Update Contact is ready to connect to the API.";
}


// --------------------------------------------------
// DELETE CONTACT
// --------------------------------------------------

function deleteContact()
{
    let id =
        document.getElementById("editContactId").value;

    let name =
        document.getElementById("editName").value;

    if (!confirm("Delete " + name + "?"))
    {
        return;
    }

    /*
        API CONNECTION GOES HERE.

        Send the contact ID to the delete endpoint.
    */

    document.getElementById("editResult").innerHTML =
        "Delete Contact is ready to connect to the API.";
}


// --------------------------------------------------
// CLEAR ADD FORM
// --------------------------------------------------

function clearAddForm()
{
    document.getElementById("contactName").value = "";

    document.getElementById("contactPhone").value = "";
    document.getElementById("contactPhone").disabled = false;

    document.getElementById("contactEmail").value = "";
    document.getElementById("contactEmail").disabled = false;

    document.getElementById("phoneStatus").value = "available";
    document.getElementById("emailStatus").value = "available";

    document.getElementById("contactCategory").value = "Family";

    document.getElementById("addResult").innerHTML = "";
}


// --------------------------------------------------
// RUN WHEN PAGE LOADS
// --------------------------------------------------

window.onload = function()
{
    if (document.getElementById("userName") !== null)
    {
        loadUser();
    }
};
