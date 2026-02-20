// Supabase Configuration
// Replace these values with your Supabase project credentials
const SUPABASE_URL = 'https://igfpnaboighqrivtniji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZnBuYWJvaWdocXJpdnRuaWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNTc2NDMsImV4cCI6MjA1MzczMzY0M30.pE3r2JQZk8T5iCjKQG9E5rQrG1K2XZ8vN5wL6YkXx3M';

// Initialize Supabase client
const supabaseClient = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,

    async request(endpoint, options = {}) {
        const url = `${this.url}/rest/v1/${endpoint}`;
        const headers = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': options.prefer || 'return=representation'
        };

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: { ...headers, ...options.headers },
                body: options.body ? JSON.stringify(options.body) : null
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Request failed');
            return data;
        } catch (error) {
            console.error('Supabase request error:', error);
            throw error;
        }
    },

    // ==================== SUBJECTS ====================
    async getSubjects() {
        return this.request('subjects?order=created_at');
    },

    async addSubject(subject) {
        return this.request('subjects', {
            method: 'POST',
            body: subject
        });
    },

    async updateSubject(id, updates) {
        return this.request(`subjects?id=eq.${id}`, {
            method: 'PATCH',
            body: updates
        });
    },

    async deleteSubject(id) {
        return this.request(`subjects?id=eq.${id}`, {
            method: 'DELETE'
        });
    },

    // ==================== NOTES ====================
    async getNotes() {
        return this.request('notes?order=created_at.desc');
    },

    async addNote(note) {
        return this.request('notes', {
            method: 'POST',
            body: note
        });
    },

    async updateNote(id, updates) {
        return this.request(`notes?id=eq.${id}`, {
            method: 'PATCH',
            body: updates
        });
    },

    async deleteNote(id) {
        return this.request(`notes?id=eq.${id}`, {
            method: 'DELETE'
        });
    },

    // ==================== NOTICES ====================
    async getNotices() {
        return this.request('notices?order=created_at.desc');
    },

    async addNotice(notice) {
        return this.request('notices', {
            method: 'POST',
            body: notice
        });
    },

    async updateNotice(id, updates) {
        return this.request(`notices?id=eq.${id}`, {
            method: 'PATCH',
            body: updates
        });
    },

    async markNoticeRead(id) {
        return this.updateNotice(id, { read: true });
    },

    async deleteNotice(id) {
        return this.request(`notices?id=eq.${id}`, {
            method: 'DELETE'
        });
    },

    // ==================== CLASS TESTS ====================
    async getClassTests() {
        return this.request('class_tests?order=date');
    },

    async addClassTest(test) {
        return this.request('class_tests', {
            method: 'POST',
            body: test
        });
    },

    async updateClassTest(id, updates) {
        return this.request(`class_tests?id=eq.${id}`, {
            method: 'PATCH',
            body: updates
        });
    },

    async deleteClassTest(id) {
        return this.request(`class_tests?id=eq.${id}`, {
            method: 'DELETE'
        });
    },

    // ==================== TODAY'S ROUTINE ====================
    async getTodaysRoutine() {
        return this.request('todays_routine?order=slot_number');
    },

    async saveTodaysRoutine(routine) {
        // First delete all existing routine
        const existing = await this.getTodaysRoutine();
        for (const item of existing) {
            await this.deleteTodaysRoutine(item.id);
        }

        // Then add new routine
        const results = [];
        for (const item of routine) {
            const result = await this.request('todays_routine', {
                method: 'POST',
                body: item
            });
            results.push(result);
        }
        return results;
    },

    async deleteTodaysRoutine(id) {
        return this.request(`todays_routine?id=eq.${id}`, {
            method: 'DELETE'
        });
    },

    // ==================== WEBSITE SETTINGS ====================
    async getWebsiteSettings() {
        const settings = await this.request('website_settings?limit=1');
        return settings[0] || null;
    },

    async updateWebsiteSettings(id, updates) {
        return this.request(`website_settings?id=eq.${id}`, {
            method: 'PATCH',
            body: updates
        });
    },

    // ==================== MEMBERS ====================
    async getMembers() {
        return this.request('members?order=created_at');
    },

    async addMember(member) {
        return this.request('members', {
            method: 'POST',
            body: member
        });
    },

    async updateMember(id, updates) {
        return this.request(`members?id=eq.${id}`, {
            method: 'PATCH',
            body: updates
        });
    },

    async deleteMember(id) {
        return this.request(`members?id=eq.${id}`, {
            method: 'DELETE'
        });
    },

    // ==================== VISITOR DATA ====================
    async getVisitorData() {
        const data = await this.request('visitor_data?limit=1&order=created_at.desc');
        return data[0] || null;
    },

    async updateVisitorCount(date, count) {
        const existing = await this.request(`visitor_data?date=eq.${date}`);
        
        if (existing.length > 0) {
            return this.request(`visitor_data?id=eq.${existing[0].id}`, {
                method: 'PATCH',
                body: { count: count + 1 }
            });
        } else {
            return this.request('visitor_data', {
                method: 'POST',
                body: { date, count: 1 }
            });
        }
    }
};

// Helper function to check if Supabase is configured
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co' && 
           SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
}

// Export for use in main app
window.supabaseClient = supabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
