var axios = require('axios')

class Redmine {

  constructor(key) {
    this.key = key
    this.host = 'https://pm.handh.ru/'
    this.readyStatus = false
    this.reviewStatus = false
    this.completeStatus = false
    this.workStatus = false
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
  };

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
  };

  async setStatusReviewAndTl(taskNumber, comment) {
    let task = await this.get('issues/' + taskNumber + '.json')
    let project = await this.get('projects/' + task.issue.project.id + '.json')

    let teamLead = project.project.custom_fields.find(function (element, index) {
      if (element.name && element.name === 'Старший разработчик') {
        return true
      }
    })

    await this.put('issues/' + taskNumber + '.json', {
      issue: {
        assigned_to_id: teamLead.value,
        status_id: this.reviewStatus,
        notes: comment || ''
      }
    })
  }

  async setStatusReadyBuild(taskNumber) {
    await this.put('issues/' + taskNumber + '.json', {
      issue: {
        status_id: this.readyStatus
      }
    })
  }

  async setStatusWork(taskNumber, comment) {
    let task = await this.get('issues/' + taskNumber + '.json?include=journals')
    let user = task.issue.journals.pop().user

    await this.put('issues/' + taskNumber + '.json', {
      issue: {
        assigned_to_id: user.id,
        status_id: this.workStatus,
        notes: comment || ''
      }
    })
  }

  async bitriseHook(projectName, buildNumber) {
    let project = await this.get('projects/' + projectName + '.json')
    let issues = await this.get('issues.json?project_id=' + project.project.id + '&status_id=' + this.readyStatus)
    let tester = project.project.custom_fields.find(function (element) {
      if (element.name && element.name === 'Тестировщик') {
        return true
      }
    })
    if (issues.issues.length) {
      let versionField = issues.issues[0].custom_fields.find(function (item) {
        if (item.name === 'Версия приложения') {
          return item
        }
      })
      console.log(versionField)
      for (let i = 0; i < issues.issues.length; i++) {
        let data = {
          issue: {
            assigned_to_id: tester.value,
            status_id: this.completeStatus,
            custom_field_values: {},
            notes: 'Build: ' + buildNumber
          }
        }
        if (versionField) {
          data.issue.custom_field_values[versionField.id] = buildNumber
        }
        await this.put('issues/' + issues.issues[i].id + '.json', data)
      }
    } else {
      console.log('no issues')
    }
  }
}

exports.Redmine = Redmine;
