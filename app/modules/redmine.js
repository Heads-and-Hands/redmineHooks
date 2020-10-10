var axios = require('axios')

class Redmine {

    constructor(key) {
        this.key = key
        this.host = 'https://pm.handh.ru/'

        this.statHost = 'http://stat.handh.ru:9898/'
        this.statToken = 'keddva5rd'

        this.readyStatus = false
        this.reviewStatus = false
        this.completeStatus = false
        this.workStatus = false
        this.newStatus = false
        this.closeStatus = false;
        this.getStatuses()
    }

    async getStatuses() {
        let statuses = await this.get('issue_statuses.json')
        for (let i = 0; i < statuses.issue_statuses.length; i++) {
            if (statuses.issue_statuses[i].name === 'Сделано') {
                this.completeStatus = statuses.issue_statuses[i].id
            } else if (statuses.issue_statuses[i].name === 'Ревью') {
                this.reviewStatus = statuses.issue_statuses[i].id
            } else if (statuses.issue_statuses[i].name === 'Готово к сборке') {
                this.readyStatus = statuses.issue_statuses[i].id
            } else if (statuses.issue_statuses[i].name === 'В работе') {
                this.workStatus = statuses.issue_statuses[i].id
            } else if (statuses.issue_statuses[i].name === 'Новая') {
                this.newStatus = statuses.issue_statuses[i].id
            } else if (statuses.issue_statuses[i].name === 'Закрыта') {
                this.closeStatus = statuses.issue_statuses[i].id
            }
        }
    }

    async get(url) {
        try {
            const response = await axios.get(this.host + url, {headers: {'X-Redmine-API-Key': this.key}})
            return response.data
        } catch (error) {
            console.log(error.response.status, error.response.statusText)
        }
    }

    async put(url, data) {
        try {
            const response = await axios.put(
                this.host + url,
                data || {},
                {headers: {'X-Redmine-API-Key': this.key}})
            return response.data
        } catch (error) {
            console.log(error.response.status, error.response.statusText)
        }
    }

    async setStatusReview(taskNumbers, comment, assignTo = null) {
        console.log("setStatusReviewAndTl: " + assignTo)
        //let taskProject = await this.get('issues/' + taskNumbers[0] + '.json')
        //let project = await this.get('projects/' + taskProject.issue.project.id + '.json')

        let payload = {
            issue: {
                status_id: this.reviewStatus,
                notes: comment || ''
            }
        }        
        if (assignTo != null) {
            let user_id = await this.getUserIdByGHLogin(assignTo)    
            //payload["issue"] = {} 
            payload["issue"]["assigned_to_id"] = user_id
        }
        const promises = []
        const promisesPre = []
        for (let taskId of taskNumbers) {
            let taskInRedmine = await this.get('issues/' + taskId + '.json')
            // В ревью берем только задачи новые и в работе
            if (taskInRedmine.issue.status.id == this.newStatus || taskInRedmine.issue.status.id == this.workStatus) {
                // сначала задачи ставим в работе, чтоб ремдайн дал их поставить в ревью
                promisesPre.push(this.checkOnNewStatus(taskId))

                promises.push(this.put('issues/' + taskId + '.json', payload))
            }   
        }
        await Promise.all(promisesPre);
        await Promise.all(promises);
    }

    async setStatusReadyBuild(taskNumbers, assignTo = null) {
        console.log("setStatusReadyBuild: " + assignTo)
        let payload = {
            issue: {
                status_id: this.readyStatus
            }
        }
        if (assignTo != null) {
            let user_id = await this.getUserIdByGHLogin(assignTo)
            //payload["issue"] = {}
            payload["issue"]["assigned_to_id"] = user_id
        }

        const promisesNew = []
        const promisesWork = []
        const promises = []
        for (let taskId of taskNumbers) {
            let taskInRedmine = await this.get('issues/' + taskId + '.json')
            // В сборку берем только задачи новые, в работе и на ревью
            if (taskInRedmine.issue.status.id == this.newStatus || taskInRedmine.issue.status.id == this.workStatus
            || taskInRedmine.issue.status.id == this.reviewStatus) {
                // Прежде чем перевести в сборку ставим статус работа у новых
                promisesNew.push(this.checkOnReviewStatus(taskId))
                // Прежде чем перевести в сборку ставим статус ревью у рабочих
                promisesWork.push(this.checkOnReviewStatus(taskId))

                promises.push(this.put('issues/' + taskId + '.json', payload))
            }
        }
        await Promise.all(promisesNew);
        await Promise.all(promisesWork);
        await Promise.all(promises);
    }

    async setStatusWork(taskNumbers, comment, assignTo = null) {
        console.log("setStatusWorkAndAssignTo: " + assignTo)

        let payload = {
            issue: {
                status_id: this.workStatus,
                notes: comment || ''
            }
        }
        if (assignTo != null) {
            let user_id = await this.getUserIdByGHLogin(assignTo)
            //payload["issue"] = {}
            payload["issue"]["assigned_to_id"] = user_id
        }
        const promises = []
        for (let taskId of taskNumbers) {
            let taskInRedmine = await this.get('issues/' + taskId + '.json')
            // В работу переводим только новые задачи
            if (taskInRedmine.issue.status.id == this.newStatus) {
                // хз зачем это, пока закомментил
                //await this.checkOnNewStatus(taskId)
                promises.push(this.put('issues/' + taskId + '.json', payload))
            }
        }
        await Promise.all(promises);
    }
    
    async getUserIdByGHLogin(login) {        
        if (login != null) {
            let url = this.statHost + 'users?token=' + this.statToken + '&search=' + login
            try {
                let response = await axios.get(url)
                for (let u of response.data) {
                    if (u.GitHub == login) {
                        return u.Id
                    }
                }
            } catch {
                console.log(error.response.status, error.response.statusText)
            }
        }
        console.log("user by gh: " + user_id) 
        return 0
    }

    async setStatusComplete(projectName, buildNumber, needAssign = true) {
        let project = await this.get('projects/' + projectName + '.json')
        let issues = await this.get('issues.json?project_id=' + project.project.id + '&status_id=' + this.readyStatus)        
        let tester = project.project.custom_fields.find(function (element) {
            if (element.name && element.name === 'Тестировщик') {
                return true
            }
        })
        let payload = {
            issue: {
                status_id: this.completeStatus,
                custom_field_values: {
                    '32': buildNumber
                },
                notes: 'Build: ' + buildNumber
            }
        }
        if (needAssign) {
            //payload["issue"] = {}
            payload["issue"]["assigned_to_id"] = tester.value
        }
        
        const issuesIds = []
        const promises = []
        if (issues.issues.length) {
            for (let issue of issues.issues) {
                issuesIds.push(issue.id)
                let issueUrl = 'issues/' + issue.id + '.json'
                console.log(issueUrl)
                promises.push(this.put(issueUrl, payload))
            }
            await Promise.all(promises);
        } else {
            console.log('no issues')
        }

        return issuesIds
    }

    async checkOnNewStatus(taskId) {
        let taskInRedmine = await this.get('issues/' + taskId + '.json')
        if (taskInRedmine.issue.status.id === this.newStatus) {
            await this.put('issues/' + taskId + '.json', {
                issue: {
                    status_id: this.workStatus,
                }
            })
        }
    }

    async checkOnReviewStatus(taskId) {
        let taskInRedmine = await this.get('issues/' + taskId + '.json')
        if (taskInRedmine.issue.status.id === this.workStatus) {
            await this.put('issues/' + taskId + '.json', {
                issue: {
                    status_id: this.reviewStatus,
                }
            })
        }
    }    

    async checkTaskStatus(taskNumbers) {
        for (let taskId of taskNumbers) {
            let taskInRedmine = await this.get('issues/' + taskId + '.json')
            if (taskInRedmine.issue.status.id === this.reviewStatus && taskInRedmine.issue.tracker.name === 'Таск') {
                await this.put('issues/' + taskId + '.json', {
                    issue: {
                        status_id: this.completeStatus,
                    }
                })
                await this.put('issues/' + taskId + '.json', {
                    issue: {
                        status_id: this.closeStatus,
                    }
                })
            }
        }
    }
}

exports.Redmine = Redmine
