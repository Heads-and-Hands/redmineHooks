var axios = require('axios')

class Redmine {

  constructor(key) {
    this.key = key
    this.host = 'https://pm.handh.ru/'
    this.readyStatus = false
    this.reviewStatus = false
    this.completeStatus = false
    this.workStatus = false
    this.newStatus = false
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

  async setStatusReviewAndTl(taskNumbers, comment) {
    let taskProject = await this.get('issues/' + taskNumbers[0] + '.json')
    let project = await this.get('projects/' + taskProject.issue.project.id + '.json')

    let teamLead = project.project.custom_fields.find(function (element, index) {
      if (element.name && element.name === 'Старший разработчик') {
        return true
      }
    })
    for (let taskId of taskNumbers) {
      await this.checkOnNewStatus(taskId)
      await this.put('issues/' + taskId + '.json', {
        issue: {
          assigned_to_id: teamLead.value,
          status_id: this.reviewStatus,
          notes: comment || ''
        }
      })
    }
  }

  async setStatusReadyBuild(taskNumbers) {
    for (let taskId of taskNumbers) {
      await this.checkOnNewStatus(taskId)
      await this.put('issues/' + taskId + '.json', {
        issue: {
          status_id: this.readyStatus
        }
      })
    }
  }

  async setStatusWork(taskNumbers, comment) {
    let task = await this.get('issues/' + taskNumbers[0] + '.json?include=journals')
    let user = task.issue.journals.pop().user
    for (let taskId of taskNumbers) {
      await this.checkOnNewStatus(taskId)
      await this.put('issues/' + taskId + '.json', {
        issue: {
          assigned_to_id: user.id,
          status_id: this.workStatus,
          notes: comment || ''
        }
      })
    }
  }

  async bitriseHook(projectName, buildNumber) {
    let project = await this.get('projects/' + projectName + '.json')
    let issues = await this.get('issues.json?project_id=' + project.project.id + '&status_id=' + this.readyStatus)
    let issuesIds = []
    let tester = project.project.custom_fields.find(function (element) {
      if (element.name && element.name === 'Тестировщик') {
        return true
      }
    })
    if (issues.issues.length) {
      for (let issue of issues.issues) {
        issuesIds.push(issue.id)
        let data = {
          issue: {
            assigned_to_id: tester.value,
            status_id: this.completeStatus,
            custom_field_values: {
              '32': buildNumber
            },
            notes: 'Build: ' + buildNumber
          }
        }
        await this.put('issues/' + issue.id + '.json', data)
      }
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
}

exports.Redmine = Redmine
