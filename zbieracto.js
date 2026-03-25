javascript:
/*
    Asystent Zbieracza z GUI i Ustawieniami
    Zapamiętuje ustawienia w localStorage przeglądarki.
*/

(function() {
    if (window.location.href.indexOf('screen=place') === -1 || window.location.href.indexOf('mode=scavenge') === -1) {
        UI.InfoMessage('Skrypt działa tylko w placu w zakładce zbieractwo!', 3000, 'error');
        return;
    }

    // Jeśli okienko jest otwarte, kliknięcie skryptu je zamyka
    if ($('#scavenge_gui_window').length > 0) {
        $('#scavenge_gui_window').remove();
        return;
    }

    const units = ['spear', 'sword', 'axe', 'archer', 'light', 'marcher', 'heavy'];
    const unitNames = {spear: 'Pikinier', sword: 'Miecznik', axe: 'Topornik', archer: 'Łucznik', light: 'Lekka', marcher: 'Łucz. konny', heavy: 'Ciężka'};

    // Domyślne wartości przy pierwszym uruchomieniu
    let defaultSettings = {
        global: { archers: 1, skip_level_1: 0, max_ressources: 999999 },
        units: {}
    };
    units.forEach(u => defaultSettings.units[u] = { untouchable: 0, max: 99999 });

    // Wczytanie zapisanych ustawień (jeśli istnieją)
    let saved = localStorage.getItem('TW_Scavenge_Settings_v3');
    let settings = saved ? JSON.parse(saved) : defaultSettings;

    // Funkcja budująca główne okno
    function renderUI() {
        let html = `
            <div id="scavenge_gui_window" style="position:fixed; top:80px; right:20px; width: 320px; background:#e3d5b3; border:2px solid #7d510f; padding:12px; z-index:99999; border-radius:8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.5); font-family: Verdana, Arial; max-height: 85vh; overflow-y: auto;">
                
                <div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #7d510f; padding-bottom: 5px; margin-bottom: 10px;">
                    <h3 style="margin:0; font-size: 14px; color: #402000;">Asystent Zbieracza</h3>
                    <button id="scav_close" style="background:none; border:none; font-size:20px; cursor:pointer; font-weight:bold; color: #7d510f; line-height:1;">&times;</button>
                </div>
                
                <div style="font-size: 11px; margin-bottom: 10px; background: #f4e4c1; padding: 5px; border: 1px solid #c1a264; border-radius: 4px;">
                    <strong>Ustawienia Globalne:</strong><br>
                    <label style="cursor:pointer; display:block; margin-top:3px;"><input type="checkbox" id="scav_archers" ${settings.global.archers ? 'checked' : ''}> Gramy z łucznikami (Świat z łukami)</label>
                    <label style="cursor:pointer; display:block; margin-top:3px;"><input type="checkbox" id="scav_skip_1" ${settings.global.skip_level_1 ? 'checked' : ''}> Pomiń poziom 1 (Leniwe zbieractwo)</label>
                    <label style="display:block; margin-top:3px;">Max sur. z jednego poziomu: <br><input type="number" id="scav_max_res" value="${settings.global.max_ressources}" style="width:80px; padding:2px; font-size:10px; margin-top:2px;"></label>
                </div>

                <div style="font-size: 11px; margin-bottom: 10px;">
                    <strong>Limity Jednostek:</strong>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size:10px;">
                        <tr style="background: #c1a264;">
                            <th style="padding: 4px; text-align:left;">Jednostka</th>
                            <th style="padding: 4px; text-align:center;" title="Ile sztuk ma zawsze zostać w wiosce?">Zostaw</th>
                            <th style="padding: 4px; text-align:center;" title="Maksymalnie ile sztuk wyślesz w sumie?">Max wyślij</th>
                        </tr>
        `;

        // Generowanie wierszy dla jednostek
        units.forEach(unit => {
            if (!settings.global.archers && (unit === 'archer' || unit === 'marcher')) return;
            html += `
                <tr style="border-bottom: 1px solid #c1a264;">
                    <td style="padding: 4px;"><b>${unitNames[unit]}</b></td>
                    <td style="text-align:center;"><input type="number" class="scav_u_untouchable" data-unit="${unit}" value="${settings.units[unit].untouchable}" style="width:50px; font-size:10px; text-align:center;"></td>
                    <td style="text-align:center;"><input type="number" class="scav_u_max" data-unit="${unit}" value="${settings.units[unit].max}" style="width:50px; font-size:10px; text-align:center;"></td>
                </tr>
            `;
        });

        html += `
                    </table>
                    <button id="scav_save_settings" class="btn" style="width: 100%; margin-top: 8px; padding: 5px; font-size:11px;">Zapisz i Przelicz</button>
                </div>
                <hr style="border-color:#c1a264; margin: 10px 0;">
                
                <div id="scav_action_area" style="font-size: 11px;">
                    </div>
            </div>
        `;

        $('body').append(html);
        
        // Obsługa interfejsu
        $('#scav_close').click(function() { $('#scavenge_gui_window').remove(); });
        $('#scav_save_settings').click(saveSettings);

        // Zmiana checkboxa łuczników wymaga przeładowania tabelki
        $('#scav_archers').change(function() {
            saveSettings(false); // Zapisz bez komunikatu
            $('#scavenge_gui_window').remove();
            renderUI();
        });

        calculateAndRenderActions();
    }

    // Zapisywanie ustawień do pamięci przeglądarki
    function saveSettings(showMessage = true) {
        settings.global.archers = $('#scav_archers').is(':checked') ? 1 : 0;
        settings.global.skip_level_1 = $('#scav_skip_1').is(':checked') ? 1 : 0;
        settings.global.max_ressources = parseInt($('#scav_max_res').val()) || 999999;

        $('.scav_u_untouchable').each(function() {
            settings.units[$(this).data('unit')].untouchable = parseInt($(this).val()) || 0;
        });
        $('.scav_u_max').each(function() {
            settings.units[$(this).data('unit')].max = parseInt($(this).val()) || 99999;
        });

        localStorage.setItem('TW_Scavenge_Settings_v3', JSON.stringify(settings));
        
        if (showMessage) {
            UI.SuccessMessage('Ustawienia zapisane!', 2000);
            calculateAndRenderActions();
        }
    }

    // Przeliczanie wojsk i renderowanie przycisków
    function calculateAndRenderActions() {
        let availableUnits = {};
        let totalUsableUnits = 0;

        units.forEach(unit => {
            if (settings.global.archers === 0 && (unit === 'archer' || unit === 'marcher')) {
                availableUnits[unit] = 0;
                return;
            }

            let field = $(`[name=${unit}]`);
            if (field.length > 0 && field[0].parentNode.children[1]) {
                let match = field[0].parentNode.children[1].innerText.match(/\d+/);
                let available = match ? parseInt(match[0]) : 0;
                
                let uSet = settings.units[unit];
                if (available > uSet.untouchable) available -= uSet.untouchable;
                else available = 0;
                
                if (available > uSet.max) available = uSet.max;

                availableUnits[unit] = available;
                totalUsableUnits += available;
            } else {
                availableUnits[unit] = 0;
            }
        });

        let unfree_levels = document.getElementsByClassName('btn btn-default free_send_button btn-disabled');
        let unlocked_levels = document.getElementsByClassName('btn btn-default free_send_button');
        let free_levels = unlocked_levels.length - unfree_levels.length;

        let html = `<strong>Gotowe do drogi (po cięciach):</strong><br><ul style="list-style-type:none; padding-left:0; margin: 5px 0;">`;
        if (totalUsableUnits === 0) {
            html += `<li><i>Brak wojsk (lub blokują je ustawienia).</i></li>`;
        } else {
            units.forEach(unit => {
                if(availableUnits[unit] > 0) {
                    html += `<li style="display:inline-block; margin-right:10px;"><span class="icon header ${unit}"></span> <b>${availableUnits[unit]}</b></li>`;
                }
            });
        }
        html += `</ul>`;

        if (free_levels === 0) {
            html += `<div style="color:red; font-weight:bold; font-size: 12px; text-align:center; padding: 10px 0;">Brak wolnych poziomów!</div>`;
        } else {
            let packs = [15, 6, 3, 2]; // Wagi czasowe
            let levelNames = ["Leniwe (1)", "Skromne (2)", "Sprytne (3)", "Wielkie (4)"];
            let activeWeights = [];
            
            // Logika pomijania poziomu 1
            let startLevel = (settings.global.skip_level_1 === 1 && free_levels > 1) ? 1 : 0;
            
            for (let i = startLevel; i < free_levels + startLevel && i < 4; i++) {
                activeWeights.push({ weight: packs[i], name: levelNames[i] });
            }
            
            let totalWeight = activeWeights.reduce((a, b) => a + b.weight, 0);

            html += `<div style="margin-top: 10px;"><strong>Rozdziel (Równy czas):</strong></div>`;
            activeWeights.forEach((lvl, index) => {
                let ratio = lvl.weight / totalWeight;
                
                html += `
                    <div style="border:1px solid #c1a264; padding:5px; margin-bottom:5px; background:#f4e4c1; border-radius:4px;">
                        <button class="btn fill-level-btn" data-ratio="${ratio}" style="width:100%; padding:6px; font-size:11px; font-weight:bold; cursor:pointer;">
                            Wypełnij: ${lvl.name}
                        </button>
                    </div>
                `;
            });
        }

        $('#scav_action_area').html(html);

        // Funkcja wpisująca w inputy Plemion
        function fillInput(unit, number) {
            let field = $(`[name=${unit}]`);
            if(field.length > 0) {
                field.trigger('focus').trigger('keydown').val(number).trigger('keyup').trigger('change').blur();
            }
        }

        // Akcje przycisków na konkretne poziomy
        $('.fill-level-btn').off('click').on('click', function() {
            let r = parseFloat($(this).attr('data-ratio'));
            
            units.forEach(unit => {
                if (availableUnits[unit] > 0) {
                    let amount = Math.floor(availableUnits[unit] * r);
                    fillInput(unit, amount);
                    availableUnits[unit] -= amount; 
                } else {
                    fillInput(unit, 0);
                }
            });
            
            // Po kliknięciu ukryj przycisk, aby go nie kliknąć omyłkowo podwójnie
            $(this).parent().fadeOut(200);
        });
    }

    // Uruchomienie skryptu -> renderowanie widoku
    renderUI();

})();
