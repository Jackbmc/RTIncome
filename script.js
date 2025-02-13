class IncomeTracker {
    constructor() {
        this.hourlyRate = 0;
        this.monthlyBonus = 0;
        this.monthlyExpenses = 0;
        this.currentIncome = 0;
        this.isTracking = false;
        this.isWorking = true;
        this.lastUpdateTime = null;
        this.trackingStartTime = null;
        this.workingPeriods = [];
        this.currentWorkPeriod = null;
        this.cookiesAccepted = false;
        
        // DOM elements
        this.hourlyRateInput = document.getElementById('hourlyRate');
        this.monthlyBonusInput = document.getElementById('monthlyBonus');
        this.monthlyExpensesInput = document.getElementById('monthlyExpenses');
        this.workingToggle = document.getElementById('workingToggle');
        this.startButton = document.getElementById('startTracking');
        this.resetButton = document.getElementById('resetTracking');
        this.incomeAmount = document.getElementById('incomeAmount');
        this.perSecond = document.getElementById('perSecond');
        this.perMinute = document.getElementById('perMinute');
        this.perHour = document.getElementById('perHour');
        this.cookieConsent = document.getElementById('cookieConsent');
        
        this.setupEventListeners();
        this.initializeCookieConsent();
        this.loadPersistedData();
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.toggleTracking());
        this.resetButton.addEventListener('click', () => this.resetTracking());
        this.hourlyRateInput.addEventListener('input', () => this.updateRates());
        this.monthlyBonusInput.addEventListener('input', () => this.updateRates());
        this.monthlyExpensesInput.addEventListener('input', () => this.updateRates());
        this.workingToggle.addEventListener('change', () => this.toggleWorking());
        
        document.getElementById('acceptCookies').addEventListener('click', () => {
            this.acceptCookies();
            this.hideCookieConsent();
        });
        
        document.getElementById('declineCookies').addEventListener('click', () => {
            this.declineCookies();
            this.hideCookieConsent();
        });
    }

    calculateTotalIncome(startTime, endTime) {
        // Calculate continuous income (bonus and expenses) for the entire period
        const totalSeconds = (endTime - startTime) / 1000;
        const bonusPerSecond = (this.monthlyBonus * 12) / (52 * 40 * 3600);
        const expensesPerSecond = (this.monthlyExpenses * 12) / (52 * 40 * 3600);
        const continuousIncome = (bonusPerSecond - expensesPerSecond) * totalSeconds;

        // Calculate income from hourly rate during work periods
        const workedSeconds = this.calculateWorkedSeconds(startTime, endTime);
        const hourlyIncome = (this.hourlyRate * workedSeconds) / 3600;

        return continuousIncome + hourlyIncome;
    }

    toggleWorking() {
        const now = Date.now();
        this.isWorking = this.workingToggle.checked;
        
        if (this.isWorking) {
            this.currentWorkPeriod = { start: now, end: null };
        } else if (this.currentWorkPeriod) {
            this.currentWorkPeriod.end = now;
            this.workingPeriods.push(this.currentWorkPeriod);
            this.currentWorkPeriod = null;
        }
        
        this.updateRates();
        this.persistData();
    }

    calculateWorkedSeconds(startTime, endTime) {
        let totalWorkedSeconds = 0;
        const periods = [...this.workingPeriods];
        
        if (this.currentWorkPeriod) {
            periods.push({
                start: this.currentWorkPeriod.start,
                end: Date.now()
            });
        }
        
        for (const period of periods) {
            const periodStart = Math.max(period.start, startTime);
            const periodEnd = period.end ? Math.min(period.end, endTime) : endTime;
            
            if (periodStart < periodEnd) {
                totalWorkedSeconds += (periodEnd - periodStart) / 1000;
            }
        }
        
        return totalWorkedSeconds;
    }

    initializeCookieConsent() {
        const cookiePreference = localStorage.getItem('cookiePreference');
        if (!cookiePreference) {
            this.showCookieConsent();
        } else {
            this.cookiesAccepted = cookiePreference === 'accepted';
        }
    }

    showCookieConsent() {
        this.cookieConsent.classList.add('visible');
    }

    hideCookieConsent() {
        this.cookieConsent.classList.remove('visible');
    }

    acceptCookies() {
        this.cookiesAccepted = true;
        localStorage.setItem('cookiePreference', 'accepted');
    }

    declineCookies() {
        this.cookiesAccepted = false;
        localStorage.setItem('cookiePreference', 'declined');
        this.clearPersistedData();
    }

    loadPersistedData() {
        if (!this.cookiesAccepted) return;
        
        const persistedData = localStorage.getItem('incomeTrackerData');
        if (persistedData) {
            const data = JSON.parse(persistedData);
            
            // Restore input values and states
            this.hourlyRate = parseFloat(data.hourlyRate) || 0;
            this.monthlyBonus = parseFloat(data.monthlyBonus) || 0;
            this.monthlyExpenses = parseFloat(data.monthlyExpenses) || 0;
            this.hourlyRateInput.value = this.hourlyRate;
            this.monthlyBonusInput.value = this.monthlyBonus;
            this.monthlyExpensesInput.value = this.monthlyExpenses;
            
            // Restore working state
            this.workingPeriods = data.workingPeriods || [];
            this.currentWorkPeriod = data.currentWorkPeriod;
            this.isWorking = data.isWorking;
            this.workingToggle.checked = this.isWorking;
            
            // Calculate total income if tracking was active
            if (data.isTracking && data.trackingStartTime) {
                const now = Date.now();
                this.trackingStartTime = data.trackingStartTime;
                this.isTracking = true;
                this.startButton.textContent = 'Stop Tracking';
                
                // Calculate total income from tracking start to now
                this.currentIncome = this.calculateTotalIncome(this.trackingStartTime, now);
                
                // Start live updates
                this.lastUpdateTime = performance.now();
                this.updateIncome();
            }
            
            // Update displayed rates
            this.updateRates();
        }
    }

    persistData() {
        if (!this.cookiesAccepted) return;
        
        const data = {
            hourlyRate: this.hourlyRate,
            monthlyBonus: this.monthlyBonus,
            monthlyExpenses: this.monthlyExpenses,
            isTracking: this.isTracking,
            isWorking: this.isWorking,
            trackingStartTime: this.trackingStartTime,
            workingPeriods: this.workingPeriods,
            currentWorkPeriod: this.currentWorkPeriod
        };
        
        localStorage.setItem('incomeTrackerData', JSON.stringify(data));
    }

    clearPersistedData() {
        localStorage.removeItem('incomeTrackerData');
    }

    calculateNetIncomePerSecond() {
        // Calculate continuous rates (bonus and expenses)
        const bonusPerSecond = (this.monthlyBonus * 12) / (52 * 40 * 3600);
        const expensesPerSecond = (this.monthlyExpenses * 12) / (52 * 40 * 3600);
        const continuousRate = bonusPerSecond - expensesPerSecond;
        
        // Add hourly rate only if working
        const hourlyRatePerSecond = this.isWorking ? this.hourlyRate / 3600 : 0;
        
        return continuousRate + hourlyRatePerSecond;
    }

    updateRates() {
        this.hourlyRate = parseFloat(this.hourlyRateInput.value) || 0;
        this.monthlyBonus = parseFloat(this.monthlyBonusInput.value) || 0;
        this.monthlyExpenses = parseFloat(this.monthlyExpensesInput.value) || 0;
        
        // Calculate continuous rates
        const bonusPerHour = (this.monthlyBonus * 12) / (52 * 40);
        const expensesPerHour = (this.monthlyExpenses * 12) / (52 * 40);
        
        // Add hourly rate only if working
        const hourlyIncome = this.isWorking ? this.hourlyRate : 0;
        
        // Calculate net rates
        const netHourlyRate = hourlyIncome + bonusPerHour - expensesPerHour;
        
        // Update displays
        this.perHour.textContent = this.formatCurrency(netHourlyRate);
        this.perMinute.textContent = this.formatCurrency(netHourlyRate / 60);
        this.perSecond.textContent = this.formatCurrency(netHourlyRate / 3600);
        
        this.persistData();
    }

    toggleTracking() {
        this.isTracking = !this.isTracking;
        this.startButton.textContent = this.isTracking ? 'Stop Tracking' : 'Start Tracking';
        
        if (this.isTracking) {
            this.lastUpdateTime = performance.now();
            if (!this.trackingStartTime) {
                this.trackingStartTime = Date.now();
            }
            this.updateIncome();
        }
        
        this.persistData();
    }

    resetTracking() {
        this.currentIncome = 0;
        this.trackingStartTime = null;
        this.isTracking = false;
        this.workingPeriods = [];
        this.currentWorkPeriod = this.isWorking ? { start: Date.now(), end: null } : null;
        this.startButton.textContent = 'Start Tracking';
        this.incomeAmount.textContent = this.formatCurrency(0);
        this.persistData();
    }

    updateIncome() {
        if (!this.isTracking) return;

        const currentTime = performance.now();
        const elapsedSeconds = (currentTime - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = currentTime;

        const netIncomePerSecond = this.calculateNetIncomePerSecond();
        this.currentIncome += netIncomePerSecond * elapsedSeconds;
        
        this.incomeAmount.textContent = this.formatCurrency(this.currentIncome);
        
        if (Math.floor(currentTime / 5000) > Math.floor(this.lastUpdateTime / 5000)) {
            this.persistData();
        }
        
        requestAnimationFrame(() => this.updateIncome());
    }

    formatCurrency(amount) {
        const formattedAmount = amount < 0 ? `-$${Math.abs(amount).toFixed(4)}` : `$${amount.toFixed(4)}`;
        return formattedAmount;
    }
}

// Initialize the tracker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new IncomeTracker();
});