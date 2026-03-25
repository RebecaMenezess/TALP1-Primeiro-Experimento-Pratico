Feature: Exam management
  As an instructor
  I want to manage closed questions and exams
  So that I can generate exams from registered questions

  Background:
    Given the in-memory data is clean

  Scenario: Create a closed question and create an exam with that question
    When I create a question with description "Capital of Brazil" and alternatives:
      | description | isCorrect |
      | Brasilia    | true      |
      | Rio de Janeiro | false  |
      | Sao Paulo   | false     |
    Then the API response status should be 201
    And the response should contain "id"
    When I create an exam "Geography Quiz" in mode "letters" with the last created question
    Then the API response status should be 201
    And the response should contain "id"
    And the response field "mode" should be "letters"

  Scenario: Create an exam with missing questions should fail
    When I create an exam "Invalid Exam" in mode "powersOf2" with question ids:
      | id          |
      | non-existent |
    Then the API response status should be 400
    And the response field "error" should be "One or more questions do not exist"

