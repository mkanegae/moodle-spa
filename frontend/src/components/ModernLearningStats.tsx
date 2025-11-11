import React from "react";
import { Card, CardContent } from "./ui/card";
import { MenuBook, CheckCircle, School } from "@mui/icons-material";

interface ModernLearningStatsProps {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
}

export default function ModernLearningStats({
  totalCourses,
  completedCourses,
  inProgressCourses,
}: ModernLearningStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <MenuBook className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">登録中のコース</p>
              <p className="text-2xl font-semibold text-gray-900">{totalCourses}コース</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">完了したコース</p>
              <p className="text-2xl font-semibold text-gray-900">{completedCourses}コース</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <School className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">進行中のコース</p>
              <p className="text-2xl font-semibold text-gray-900">{inProgressCourses}コース</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
