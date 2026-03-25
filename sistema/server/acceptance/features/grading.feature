Feature: Grading exams from CSV files
  As an instructor
  I want to grade student responses in strict and lenient modes
  So that I can generate a class grade report

  Background:
    Given the in-memory data is clean

  Scenario: Strict grading gives zero when any alternative is wrong
    When I grade with mode "strict" using answer key CSV:
      """
      examNumber,q1,q2
      1,AC#4,5#3
      """
    And responses CSV:
      """
      examNumber,studentName,q1,q2
      1,Alice,AC,5
      1,Bob,AB,5
      """
    Then the API response status should be 200
    And student "Alice" should have total score 2
    And student "Bob" should have total score 1

  Scenario: Lenient grading is proportional by alternatives
    When I grade with mode "lenient" using answer key CSV:
      """
      examNumber,q1
      1,AC#4
      """
    And responses CSV:
      """
      examNumber,studentName,q1
      1,FullCorrect,AC
      1,OneBitWrong,A
      """
    Then the API response status should be 200
    And student "FullCorrect" should have total score 1
    And student "OneBitWrong" should have total score 0.75

