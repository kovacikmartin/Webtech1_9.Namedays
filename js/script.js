const template = document.createElement("template");

template.innerHTML = `
    <span id="curDate"></span>
    <span id="curName"></span>

    <div class="inputDateContainer">
        <input type="text" id="inputDate" placeholder="Date"></input>
        <div class="tooltipContainer">
            <span class="tooltipText">DD.MM., DD.M., D.MM., D.M.</span>
        </div>
    </div>

    <div class="inputNameContainer">
        <input type="text" id="inputName" placeholder="Name"></input>
        <ul id="nameSuggestions"></ul>
    </div>
    <style>
        @import "../css/index.css";
    </style>`;

// define new element NameDate
class NameDate extends HTMLElement{

    constructor(){
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    };

    // load data from meniny.xml and handle methods
    ajaxCall(){
        window.nameDays = $.ajax({
            url: "js/meniny.xml",
            type: "GET",
            dataType: "xml",
            success: data => {
                this.displayCurDate();
                this.displayCurName(data);
                this.shadowRoot.querySelector("#inputName").addEventListener("keyup", () => this.displayNameSuggestions(data));
                this.shadowRoot.querySelector("#inputDate").addEventListener("keyup", () => this.displayNameFromDate(data));
            },
            error: function(){
                alert("meniny.xml not found");
            }
        });
    };
    
    // display current date in DD.MM.YYYY format
    displayCurDate(){
    
        // regex removes spaces in date format (DD. MM. YYYY)
        // since when do we write date with spaces :O
        this.shadowRoot.querySelector("#curDate").innerHTML = (new Date().toLocaleDateString().replace(/\s/g, ''));
    };
    
    // displays SK name for current date
    displayCurName(namesAndDates){

        // date with leading zero for month and day to adhere to the XML
        // formatting logic found here https://stackoverflow.com/questions/3605214/javascript-add-leading-zeroes-to-date?rq=1
        let curDate = (('0' + (new Date().getMonth()+1)).slice(-2)) + '' + ('0' + (new Date().getDate())).slice(-2);
       
        let name;

        $(namesAndDates).find("zaznam").filter( function() {
            if($(this).children("den").text() == curDate)
                name = $(this).children("SK").text();               
        })

        this.shadowRoot.querySelector("#curName").innerHTML = name;
    };
    
    // display name suggestions in real time as the user is typing, in form of list items (<li>)
    // only matches names with the same starting letters as the user input
    // assign each <li> onclick function which shows the date of the name
    // uses <SK>, the shorter list of names
    displayNameSuggestions(nameDays){
    
        // access to "global" this...inside local functions, such as filter(function())
        let thisShdwRt = this.shadowRoot;
        let ths = this;
        
        let sugLimit = 4; // suggestion limit
        let inputName = this.shadowRoot.querySelector("#inputName").value.toLowerCase();

        this.shadowRoot.querySelector("#nameSuggestions").textContent = ""; // remove all children
        this.shadowRoot.querySelector("#inputDate").value = "";

        if(inputName.length)
        {
            // show all slovak names that match with user input
            $(nameDays).find("SK").filter(function(){

                // split names into array, in case there are more names on the same day
                let calendarNameArr = $(this).text().split(', ');
                for(let i = 0; i < calendarNameArr.length; i++)
                {
                    // found exact match with user input, display date
                    if(calendarNameArr[i].toLowerCase() === inputName)
                    {
                        thisShdwRt.querySelector("#nameSuggestions").textContent = "";
                        ths.displayDateOfName(calendarNameArr[i], nameDays);
                        return;
                    }

                    if(calendarNameArr[i].toLowerCase().startsWith(inputName) && !$("#inputDate").val() && sugLimit)
                    {
                        let li = document.createElement("li");
                        li.innerHTML = calendarNameArr[i];
                        thisShdwRt.querySelector("#nameSuggestions").appendChild(li);
                        thisShdwRt.querySelector("#nameSuggestions").addEventListener("click", event => ths.displayDateOfName(event.target.innerHTML, nameDays));
                        sugLimit -= 1;
                    }
                }
            });
            
            // no matches or suggestions found
            if(this.shadowRoot.querySelector("#nameSuggestions").children.length == 0 && !this.shadowRoot.querySelector("#inputDate").value)
            {
                let content = this.shadowRoot.querySelector("#inputName").value + ' is not in SK calendar';
                let li = document.createElement("li");
                li.innerHTML = content;
                this.shadowRoot.querySelector("#nameSuggestions").appendChild(li);
            }            
        }
    };

    // display date of SK name based on user input name
    // date will be displayed inside #inputDate in DD.MM. format
    displayDateOfName(name, nameDays){

        let date;
        
        $(nameDays).find("zaznam").filter(function(){
            let calendarNameArr = $(this).children("SK").text().split(', ');
            for(let i = 0; i < calendarNameArr.length; i++)
            {
                if(calendarNameArr[i].toLowerCase() === name.toLowerCase())
                {
                    // convert date to sk format, 12.31. -> 31.12.
                    date = $(this).children("den").text();
                    date = date.slice(2) + '.' + date.slice(0,2) + '.';
                }
            }
        });

        this.shadowRoot.querySelector("#inputDate").value = date;
    };

    // display name based on user input date
    // name will be displayed inside #inputName
    // if the date format is wrong, tooltip is shown
    displayNameFromDate(nameDays){
    
        this.shadowRoot.querySelector(".tooltipContainer").style.display = "none";
        this.shadowRoot.querySelector("#inputName").value = "";

        let date = this.shadowRoot.querySelector("#inputDate").value;
        let name;

        //                        days                  months
        let regex = /^(0?[1-9]|[1-2][0-9]|30|31)[.](0?[1-9]|1[0-2])[.]$/;

        if(date.match(regex))
        {    
            date = date.split(".");
            date.pop(); // removes last empty array element, caused by split on the last dot in date

            // convert date into format matching meniny.xml <den>
            for(let i = 0; i < date.length; i++)
                if(date[i].length === 1)
                    date[i] = "0" + date[i];

            date = date[1] + date[0];

            // find name or holiday for date
            $(nameDays).find("zaznam").filter(function(){
                if($(this).children("den").text() === date)
                    if($(this).children("SK").text())
                        name = $(this).children("SK").text();
                    else
                        name = $(this).children("SKsviatky").text();
            });
            this.shadowRoot.querySelector("#inputName").value = name

        }
        else
            // wrong date, show tooltip
            if(this.shadowRoot.querySelector("#inputDate").value)
                this.shadowRoot.querySelector(".tooltipContainer").style.display = "block";
    }
    
    connectedCallback(){
        this.ajaxCall();
    }
}
window.customElements.define('name-date', NameDate);