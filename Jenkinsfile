pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh 'docker build -t backend backend/'
        sh 'docker build -t frontend frontend/'
      }
    }
    stage('Deploy') {
      steps {
        sh 'kubectl apply -f k8s/'
      }
    }
  }
}