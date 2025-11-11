import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Tab,
  Tabs,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { moodleAPI } from '../services/api';
import { CourseCategory, CourseCreateRequest, ContentCreationResponse } from '../types/content';
import WebCoachHeader from './WebCoachHeader';

interface ContentRegistrationPageProps {
  onBack: () => void;
}

const ContentRegistrationPage: React.FC<ContentRegistrationPageProps> = ({ onBack }) => {
  const [contentType, setContentType] = useState<'course' | 'activity' | 'resource'>('course');
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [courseForm, setCourseForm] = useState<CourseCreateRequest>({
    fullname: '',
    shortname: '',
    categoryid: 1,
    summary: '',
    summaryformat: 1,
    format: 'topics',
    showgrades: 1,
    newsitems: 5,
    visible: 1,
    hiddensections: 0,
    groupmode: 0,
    groupmodeforce: 0,
    enablecompletion: 0,
    completionnotify: 0
  });

  const [activityForm, setActivityForm] = useState({
    courseid: 0,
    modulename: 'assign',
    name: '',
    intro: '',
    introformat: 1,
    section: 0,
    visible: 1,
    groupmode: 0,
    groupingid: 0,
    completion: 0
  });

  const [resourceForm, setResourceForm] = useState({
    courseid: 0,
    name: '',
    intro: '',
    introformat: 1,
    section: 0,
    visible: 1,
    files: [] as File[]
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const categoriesData = await moodleAPI.getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let result: ContentCreationResponse;

      switch (contentType) {
        case 'course':
          result = await moodleAPI.createCourse(courseForm);
          setSuccess(`Course "${courseForm.fullname}" created successfully with ID: ${result.id}`);
          setCourseForm({
            fullname: '',
            shortname: '',
            categoryid: 1,
            summary: '',
            summaryformat: 1,
            format: 'topics',
            showgrades: 1,
            newsitems: 5,
            visible: 1,
            hiddensections: 0,
            groupmode: 0,
            groupmodeforce: 0,
            enablecompletion: 0,
            completionnotify: 0
          });
          break;

        case 'activity':
          result = await moodleAPI.createActivity(activityForm.courseid, activityForm.modulename, activityForm);
          setSuccess(`Activity "${activityForm.name}" created successfully with ID: ${result.id}`);
          setActivityForm({
            ...activityForm,
            name: '',
            intro: ''
          });
          break;

        case 'resource':
          if (resourceForm.files.length > 0) {
            for (const file of resourceForm.files) {
              await moodleAPI.uploadFile(file, resourceForm.courseid);
            }
          }
          setSuccess(`Resource "${resourceForm.name}" created successfully`);
          setResourceForm({
            ...resourceForm,
            name: '',
            intro: '',
            files: []
          });
          break;
      }
    } catch (err: any) {
      console.error('Error creating content:', err);
      setError(err.response?.data?.message || 'Failed to create content');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setResourceForm({ ...resourceForm, files });
  };

  return (
    <Box>
      <WebCoachHeader showButtons={false} />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={onBack}
              sx={{ mr: 2 }}
            >
              Back to Courses
            </Button>
            <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
              Create New Content
            </Typography>
          </Box>
        </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Tabs
          value={contentType}
          onChange={(e, newValue) => setContentType(newValue)}
          centered
          sx={{ mb: 3 }}
        >
          <Tab value="course" label="Course" />
          <Tab value="activity" label="Activity" />
          <Tab value="resource" label="Resource" />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {contentType === 'course' && (
            <Box>
              <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                Course Information
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Course Name"
                  value={courseForm.fullname}
                  onChange={(e) => setCourseForm({ ...courseForm, fullname: e.target.value })}
                  required
                  fullWidth
                />

                <TextField
                  label="Course Code"
                  value={courseForm.shortname}
                  onChange={(e) => setCourseForm({ ...courseForm, shortname: e.target.value })}
                  required
                  fullWidth
                />

                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={courseForm.categoryid}
                    label="Category"
                    onChange={(e) => setCourseForm({ ...courseForm, categoryid: parseInt(String(e.target.value)) })}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Description"
                  value={courseForm.summary}
                  onChange={(e) => setCourseForm({ ...courseForm, summary: e.target.value })}
                  multiline
                  rows={4}
                  fullWidth
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Course Format</InputLabel>
                    <Select
                      value={courseForm.format}
                      label="Course Format"
                      onChange={(e) => setCourseForm({ ...courseForm, format: e.target.value })}
                    >
                      <MenuItem value="topics">Topics</MenuItem>
                      <MenuItem value="weeks">Weekly</MenuItem>
                      <MenuItem value="social">Social</MenuItem>
                      <MenuItem value="singleactivity">Single Activity</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={courseForm.visible === 1}
                        onChange={(e) => setCourseForm({ ...courseForm, visible: e.target.checked ? 1 : 0 })}
                      />
                    }
                    label="Visible"
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Group Mode</InputLabel>
                    <Select
                      value={courseForm.groupmode}
                      label="Group Mode"
                      onChange={(e) => setCourseForm({ ...courseForm, groupmode: parseInt(String(e.target.value)) })}
                    >
                      <MenuItem value={0}>No groups</MenuItem>
                      <MenuItem value={1}>Separate groups</MenuItem>
                      <MenuItem value={2}>Visible groups</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={courseForm.enablecompletion === 1}
                        onChange={(e) => setCourseForm({ ...courseForm, enablecompletion: e.target.checked ? 1 : 0 })}
                      />
                    }
                    label="Enable Completion"
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    onChange={(e) => {
                      const timestamp = e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : undefined;
                      setCourseForm({ ...courseForm, startdate: timestamp });
                    }}
                    sx={{ flex: 1 }}
                  />

                  <TextField
                    label="End Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    onChange={(e) => {
                      const timestamp = e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : undefined;
                      setCourseForm({ ...courseForm, enddate: timestamp });
                    }}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            </Box>
          )}

          {contentType === 'activity' && (
            <Box>
              <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                Activity Information
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Course ID"
                  type="number"
                  value={activityForm.courseid}
                  onChange={(e) => setActivityForm({ ...activityForm, courseid: parseInt(e.target.value) })}
                  required
                  fullWidth
                />

                <FormControl fullWidth required>
                  <InputLabel>Activity Type</InputLabel>
                  <Select
                    value={activityForm.modulename}
                    label="Activity Type"
                    onChange={(e) => setActivityForm({ ...activityForm, modulename: e.target.value })}
                  >
                    <MenuItem value="assign">Assignment</MenuItem>
                    <MenuItem value="quiz">Quiz</MenuItem>
                    <MenuItem value="forum">Forum</MenuItem>
                    <MenuItem value="resource">File/URL</MenuItem>
                    <MenuItem value="page">Page</MenuItem>
                    <MenuItem value="book">Book</MenuItem>
                    <MenuItem value="lesson">Lesson</MenuItem>
                    <MenuItem value="scorm">SCORM Package</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Activity Name"
                  value={activityForm.name}
                  onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                  required
                  fullWidth
                />

                <TextField
                  label="Description"
                  value={activityForm.intro}
                  onChange={(e) => setActivityForm({ ...activityForm, intro: e.target.value })}
                  multiline
                  rows={4}
                  fullWidth
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Section"
                    type="number"
                    value={activityForm.section}
                    onChange={(e) => setActivityForm({ ...activityForm, section: parseInt(e.target.value) })}
                    inputProps={{ min: 0 }}
                    sx={{ flex: 1 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={activityForm.visible === 1}
                        onChange={(e) => setActivityForm({ ...activityForm, visible: e.target.checked ? 1 : 0 })}
                      />
                    }
                    label="Visible"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            </Box>
          )}

          {contentType === 'resource' && (
            <Box>
              <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                Resource Information
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Course ID"
                  type="number"
                  value={resourceForm.courseid}
                  onChange={(e) => setResourceForm({ ...resourceForm, courseid: parseInt(e.target.value) })}
                  required
                  fullWidth
                />

                <TextField
                  label="Resource Name"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  required
                  fullWidth
                />

                <TextField
                  label="Description"
                  value={resourceForm.intro}
                  onChange={(e) => setResourceForm({ ...resourceForm, intro: e.target.value })}
                  multiline
                  rows={4}
                  fullWidth
                />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Files</Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Choose Files
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </Button>
                  {resourceForm.files.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      {resourceForm.files.map((file, index) => (
                        <Chip
                          key={index}
                          label={`${file.name} (${Math.round(file.size / 1024)} KB)`}
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Section"
                    type="number"
                    value={resourceForm.section}
                    onChange={(e) => setResourceForm({ ...resourceForm, section: parseInt(e.target.value) })}
                    inputProps={{ min: 0 }}
                    sx={{ flex: 1 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={resourceForm.visible === 1}
                        onChange={(e) => setResourceForm({ ...resourceForm, visible: e.target.checked ? 1 : 0 })}
                      />
                    }
                    label="Visible"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="outlined" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            >
              {loading ? 'Creating...' : `Create ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`}
            </Button>
          </Box>
        </Box>
      </Paper>
      </Container>
    </Box>
  );
};

export default ContentRegistrationPage;