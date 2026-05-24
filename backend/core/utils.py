# -*- coding: utf-8 -*-
"""
世新大學學號自動解析模組
"""

def parse_student_id_details(student_id: str) -> tuple:
    """
    解析世新大學學號邏輯
    例如: A111070036 -> degree_code='A', class_generation=111, expected_graduation_year=115
    回傳: (degree_code: str, class_generation: int, expected_graduation_year: int)
    """
    if not student_id or len(student_id) < 4:
        raise ValueError("學號格式不正確，長度不足")
        
    degree_code = student_id[0].upper() # 取首碼 A, C, M, S, D
    
    try:
        class_generation = int(student_id[1:4]) # 取 111 入學年度
    except ValueError:
        raise ValueError("學號年度解析錯誤，第 2 至 4 碼必須為數字入學年度")
        
    # 世新學制標準修業年限對照表
    duration_mapping = {
        'A': 4,  # 日間部四年制學士班 (一般大學生)
        'C': 4,  # 進修學士班 (夜間部)
        'M': 2,  # 碩士班 (研究所)
        'S': 2,  # 碩士在職專班
        'D': 4   # 博士班
    }
    
    duration = duration_mapping.get(degree_code, 4)
    expected_graduation_year = class_generation + duration
    
    return degree_code, class_generation, expected_graduation_year
