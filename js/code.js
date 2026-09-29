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
                status:response.status,
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
            sessionStorage.setItem("role", data.role);

            if (data.role === "Admin")
            {
                window.location.href = "admin.html";
            }
            else
            {
                window.location.href = "color.html";
            }
        }
        else
        {
            console.log(resultData.status)
            if (resultData.status === 401) // Bad Username/Password
            {
                result.innerHTML = "Incorrect Username / Password";
            }
            else if (resultData.status === 403) // Account Disabled
            {
                result.innerHTML = "Account disabled, please contact administrator.";
            }
            else
            {
                result.innerHTML = "Unknown Error!";
            }
            
        }
    })

    .catch(error =>
    {
        console.error(error);
        result.innerHTML = "Unknown Server Error!";
    });
}

// --------------------------------------------------
// REGISTER
// --------------------------------------------------

function doRegister()
{
    let firstName = document.getElementById("firstName").value.trim();
    let lastName = document.getElementById("lastName").value.trim();
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;
    let result = document.getElementById("registerResult");


    result.innerHTML = "";

    if (firstName === "" || lastName === "" || username === "" || password === "")
    {
        result.innerHTML = "Please fill all required fields";
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
                status: response.status,
                data: data
            };
        });
    })

    .then(resultData =>
    {
        let data = resultData.data;

        if (resultData.ok && data.id > 0)
        {
            result.innerHTML = "Registration Success! Logging you in...";

            //Login Code
            fetch("/api/index.php",
            {
                method: "POST",
                headers:
                {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(
                {
                    login: username,
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
                    sessionStorage.setItem("role", data.role);

                    if (data.role === "Admin") {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "color.html";
                    }
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
        else if (resultData.status === 401)
        {
            result.innerHTML = "Missing Required Fields";
        }
        else if (resultData.status === 409)
        {
            result.innerHTML = "Username already taken.";
        }
        else
        {
            result.innerHTML = "Registration Error! Please contact administrator.";
        }

    })

    .catch(error =>
    {
        console.error(error);
        result.innerHTML = "Registration Error! Please contact administrator.";
        
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

    document.getElementById("searchText").value = "";
    searchContact();
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
// CONTACT REQUEST
// --------------------------------------------------

async function contactRequest(action, body = null, params = {})
{
    const query = new URLSearchParams({ action, ...params });

    const options = {
        method: body === null ? "GET" : "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + sessionStorage.getItem("token")
        }
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch("/api/index.php?" + query, options);
    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || "Request failed.");
    }

    return data;
}

// --------------------------------------------------
// SEARCH CONTACT
// --------------------------------------------------

async function searchContact()
{
    let searchText =
        document.getElementById("searchText").value.trim();

    let message =
        document.getElementById("searchMessage");

    let results =
        document.getElementById("searchResults");

    message.innerHTML = "";
    results.innerHTML = "";

    //API Connection
    const params = {};

    if (searchText !== "") {
        params.q = searchText;
    }

    if (selectedCategory !== "All Contacts") {
        params.category = selectedCategory;
    }

    try {
        const data = await contactRequest("contacts", null, params);
        displayContactResults(data.contacts);
    } catch (error) {
        message.textContent = error.message;
    }
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
        const categoryColors = {
            Family: "#ff6b6b",
            Friends: "#f7b267",
            Work: "#b7d85f",
            School: "#78d5b0",
            Services: "#7fd3e6",
            Emergency: "#7fa8ff",
            Other: "#b28cff"
        };

        item.style.backgroundColor = categoryColors[contact.category] || "#ffffff";

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

async function addContact()
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

    //API Connection
    result.textContent = "";

    try {
        await contactRequest("addContact", {
            name,
            phone,
            email,
            category
        });

        contactAddedSuccess();
        await searchContact();
    } catch (error) {
        result.textContent = error.message;
    }
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
    document.getElementById("addSection").style.display = "block";
    document.getElementById("editSection").style.display = "none";
    document.getElementById("editResult").innerHTML = "";
}


// --------------------------------------------------
// UPDATE CONTACT
// --------------------------------------------------

async function updateContact()
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

    //API Connection
    result.textContent = "";

    try {
        await contactRequest("updateContact", {
            id: Number(id),
            name,
            phone,
            email,
            category
        });

        closeEditContact();
        await searchContact();
    } catch (error) {
        result.textContent = error.message;
    }

}


// --------------------------------------------------
// DELETE CONTACT
// --------------------------------------------------

async function deleteContact()
{
    let id =
        document.getElementById("editContactId").value;

    let name =
        document.getElementById("editName").value;

    if (!confirm("Delete " + name + "?"))
    {
        return;
    }

    //API Connect

    const result = document.getElementById("editResult");
    result.textContent = "";

    try {
        await contactRequest("deleteContact", {
            id: Number(id)
        });

        closeEditContact();
        await searchContact();
    } catch (error) {
        result.textContent = error.message;
    }

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

        if (sessionStorage.getItem("userId")) {
            searchContact();
        }
    }
};
