/*
    Asystent Zbieracza v5.1 (Premium Fix)
    - Naprawiono błąd "Brak wolnych poziomów" przy włączonym bonusie premium (+20%).
    - Uproszczone i skuteczniejsze wyszukiwanie przycisków w DOM.
*/

(function() {
    if (window.location.href.indexOf('screen=place') === -1 || window.location.href.indexOf('mode=scavenge') === -1) {
        UI.InfoMessage('Skrypt działa tylko w placu w zakładce zbieractwo!', 3000, 'error');
        return;
    }

    if (document.getElementById('scavenge_gui_window')) {
        document.getElementById('scavenge_gui_window').remove();
        return;
    }

    const units = ['spear', 'sword', 'axe', 'archer', 'light', 'marcher', 'heavy'];
    const unitNames = {spear: 'Pikinier', sword: 'Miecznik', axe: 'Topornik', archer: 'Łucznik', light: 'Lekka', marcher: 'Łucz. konny', heavy: 'Ciężka'};
    const unitsCapacity = {spear: 25, sword: 15, axe: 10, archer: 10, light: 80, marcher: 50, heavy: 50};

    let defaultSettings = {
        global: { archers: 1, skip_level_1: 0, max_ressources: 999999 },
        units: {}
    };
    units.forEach(u => defaultSettings.units[u] = { untouchable: 0, max: 99999 });

    let saved = localStorage.getItem('TW_Scavenge_Settings_v5'); 
    let settings;
    try {
        settings = saved ? JSON.parse(saved) : defaultSettings;
        if (!settings || !settings.global) settings = defaultSettings;
    } catch(e) {
        settings = defaultSettings;
    }

    if (typeof settings.global.max_ressources === 'undefined') settings.global.max_ressources = 999999;
    units.forEach(u => {
        if (!settings.units[u]) settings.units[u] = { untouchable: 0, max: 99999 };
    });

    function renderUI() {
        let html = `
            <div id="scavenge_gui_window" style="position:fixed; top:70px; left:50%; transform:translateX(-50%); width:90%; max-width:320px; background:#e3d5b3; border:2px solid #7d510f; padding:10px; z-index:99999; border-radius:8px; box-shadow: 0px 4px 15px rgba(0,0,0,0.6); font-family: Verdana, Arial; max-height: 85vh; overflow-y: auto;">
                
                <div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #7d510f; padding-bottom: 5px; margin-bottom: 8px;">
                    <h3 style="margin:0; font-size: 14px; color: #402000; font-weight:bold;">Zbierak v5.1</h3>
                    <div>
                        <button id="scav_toggle_settings" style="background:none; border:none; font-size:16px; cursor:pointer; color:#7d510f;" title="Ustawienia">⚙️</button>
                        <button id="scav_close" style="background:none; border:none; font-size:22px; cursor:pointer; font-weight:bold; color: #7d510f; line-height:1; margin-left:5px;">&times;</button>
                    </div>
                </div>
                
                <div id="scav_settings_panel" style="display:none;">
                    <div style="font-size: 11px; margin-bottom: 8px; background: #f4e4c1; padding: 5px; border: 1px solid #c1a264; border-radius: 4px;">
                        <strong>Globalne:</strong><br>
                        <label style="cursor:pointer; display:block; margin-top:3px;"><input type="checkbox" id="scav_archers" ${settings.global.archers ? 'checked' : ''}> Łucznicy</label>
                        <label style="cursor:pointer; display:block; margin-top:3px;"><input type="checkbox" id="scav_skip_1" ${settings.global.skip_level_1 ? 'checked' : ''}> Pomiń poziom 1</label>
                        <label style="display:block; margin-top:3px;">Max sur. z poziomu: <br><input type="number" id="scav_max_res" value="${settings.global.max_ressources}" style="width:80px; padding:2px; font-size:10px; margin-top:2px;"></label>
                    </div>

                    <div style="font-size: 11px; margin-bottom: 10px;">
                        <strong>Limity:</strong>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 3px; font-size:10px;">
                            <tr style="background: #c1a264;">
                                <th style="padding: 3px; text-align:left;">Jednostka</th>
                                <th style="padding: 3px; text-align:center;">Zostaw</th>
                                <th style="padding: 3px; text-align:center;">Max</th>
                            </tr>
        `;

        units.forEach(unit => {
            if (!settings.global.archers && (unit === 'archer' || unit === 'marcher')) return;
            html += `
                <tr style="border-bottom: 1px solid #c1a264;">
                    <td style="padding: 3px;"><b>${unitNames[unit]}</b></td>
                    <td style="text-align:center;"><input type="number" class="scav_u_untouchable" data-unit="${unit}" value="${settings.units[unit].untouchable}" style="width:40px; font-size:10px; text-align:center;"></td>
                    <td style="text-align:center;"><input type="number" class="scav_u_max" data-unit="${unit}" value="${settings.units[unit].max}" style="width:40px; font-size:10px; text-align:center;"></td>
                </tr>
            `;
        });

        html += `
                        </table>
                    </div>
                    <button id="scav_save_settings" class="btn" style="width: 100%; margin-bottom: 10px; padding: 5px; font-size:11px;">Zapisz i ukryj ustawienia</button>
                    <hr style="border-color:#c1a264; margin: 0 0 10px 0;">
                </div>
                
                <div id="scav_action_panel" style="text-align:center;">
                    <button id="scav_fill_highest" class="btn" style="width:100%; padding:12px; font-size:14px; font-weight:bold; cursor:pointer; background-color:#5c3a1b; color:white; border: 1px solid #402000; border-radius: 4px; text-shadow: 1px 1px 2px black;">
                        🚀 Wypełnij: Najwyższy Wolny
                    </button>
                    <div style="font-size:9px; margin-top:6px; color:#7d510f;">
                        Wciśnij -> wyślij w grze -> wciśnij ponownie.
                    </div>
                </div>
            </div>
        `;

        $('body').append(html);
        
        $('#scav_close').click(function() { $('#scavenge_gui_window').remove(); });
        $('#scav_toggle_settings').click(function() { $('#scav_settings_panel').slideToggle('fast'); });

        $('#scav_save_settings').click(function() {
            saveSettings(true);
            $('#scav_settings_panel').slideUp('fast');
        });
        
        $('#scav_fill_highest').click(fillOptimalLevel);
    }

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

        localStorage.setItem('TW_Scavenge_Settings_v5', JSON.stringify(settings));
        if (showMessage) UI.SuccessMessage('Ustawienia zapisane!', 1500);
    }

    function fillInput(unit, number) {
        let field = $(`[name=${unit}]`);
        if(field.length > 0) {
            field.trigger('focus').trigger('keydown').val(number).trigger('keyup').trigger('change').blur();
        }
    }

    function fillOptimalLevel() {
        let availableUnits = {};
        
        units.forEach(unit => {
            if (settings.global.archers === 0 && (unit === 'archer' || unit === 'marcher')) {
                availableUnits[unit] = 0;
                return;
            }

            let available = 0;
            let allLink = $(`a.units-entry-all[data-unit="${unit}"]`);
            if (allLink.length > 0) {
                let match = allLink.text().match(/\d+/);
                if (match) available = parseInt(match[0]);
            } else {
                let field = $(`[name=${unit}]`);
                if (field.length > 0 && field[0].parentNode.children[1]) {
                    let match = field[0].parentNode.children[1].innerText.match(/\d+/);
                    if (match) available = parseInt(match[0]);
                }
            }
            
            let uSet = settings.units[unit];
            if (available > uSet.untouchable) available -= uSet.untouchable;
            else available = 0;
            
            if (available > uSet.max) available = uSet.max;
            availableUnits[unit] = available;
        });

        // POPRAWIONE WYSZUKIWANIE POZIOMÓW (Zwykłe i Premium)
        let availableLevels = [];
        $('.scavenge-option').each(function(index) {
            // Szuka zarówno klasycznego przycisku darmowego jak i premium
            let btn = $(this).find('.free_send_button, .premium_send_button');
            if (btn.length > 0 && !btn.hasClass('btn-disabled')) {
                availableLevels.push(index);
            }
        });
        
        availableLevels.sort((a, b) => a - b);

        if (settings.global.skip_level_1 === 1) {
            if (availableLevels.includes(0) && availableLevels.length > 1) {
                availableLevels = availableLevels.filter(lvl => lvl !== 0);
            } else if (availableLevels.length === 1 && availableLevels[0] === 0) {
                UI.ErrorMessage('Został tylko 1 poziom (Leniwe), a w opcjach kazałeś go pomijać!', 3000);
                return;
            }
        }

        if (availableLevels.length === 0) {
            UI.ErrorMessage('Brak wolnych poziomów!', 2000);
            return;
        }

        let packs = [15, 6, 3, 2];
        let left_packs = availableLevels.reduce((sum, lvl) => sum + packs[lvl], 0);
        let targetLvl = availableLevels[availableLevels.length - 1]; 
        let packs_now = packs[targetLvl];
        let ratio = packs_now / left_packs;

        let assignedAmounts = {};
        let currentCapacity = 0;

        units.forEach(unit => {
            if (availableUnits[unit] > 0) {
                let amount = 0;
                if (availableLevels.length === 1) {
                    amount = availableUnits[unit]; 
                } else {
                    amount = Math.floor(availableUnits[unit] * ratio);
                }
                
                assignedAmounts[unit] = amount;
                currentCapacity += amount * unitsCapacity[unit];
            } else {
                assignedAmounts[unit] = 0;
            }
        });

        let maxRes = settings.global.max_ressources;
        if (maxRes > 0 && currentCapacity > maxRes) {
            let capRatio = maxRes / currentCapacity;
            units.forEach(unit => {
                assignedAmounts[unit] = Math.floor(assignedAmounts[unit] * capRatio);
            });
        }
        
        units.forEach(unit => { fillInput(unit, assignedAmounts[unit]); });
        
        UI.SuccessMessage(`Przygotowano: Poziom ${targetLvl + 1}`, 1500);
    }

    renderUI();

})();
