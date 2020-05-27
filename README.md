## Установка проекта
* npm install
* Добавить в переменную окружения KEY_GITHUB ключ от гитхаба в файле docker-compose.yml
* Добавить в переменную окружения KEY_REDMINE ключ от редмайна в файле docker-compose.yml

## Запуск
* npm start
## Адреса хуков
* Github: domain.url:8001/github
* Bitrise: domain.url:8001/bitrise?project={projectName}

## Запуск в контейнере

### Запуск для разработки
Из корневой папки запустить ```docker-compose up -d```

### Запуск на сервере
Скопировать один файл docker-compose.stage.yml на сервер под именем docker-compose.yml и запустить ```docker-compose up -d```

## Описание workflow

### Github
test
