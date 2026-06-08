// Updated VAN MAN App.jsx feature patch
// Use this as a guided replacement/merge with your existing App.jsx.
// It adds: map display, full job detail page state, customer-only filtering,
// loading/error/empty states, invoice print, stronger delete confirmation,
// mobile-friendly UI hooks, and frontend support hooks for geocoding/payment/socket/calendar.

import axios from "axios";
import { useState, useEffect, useMemo } from "react";
import "./App.css";
import heroImg from "./assets/hero.jpeg";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

const API = "http://localhost:5000/api";
const COLORS = ["#ff7a1a", "#c91414", "#ffcc00"];

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [name, setName] = useState(localStorage.getItem("name") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [page, setPage] = useState(localStorage.getItem("token") ? "dashboard" : "home");
  const [jobDetailId, setJobDetailId] = useState(null);
const [resetForm, setResetForm] = useState({
  email: "",
  newPassword: "",
});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pricing, setPricing] = useState({
    fullMoveBase: 150,
    transportOnlyBase: 100,
    packingHelpBase: 70,
    perHourRate: 25,
    perKmRate: 50,
    inventoryBoxRate: 10,
    heavyItemRate: 80,
    eveningCharge: 100,
  });

  const [originCoords, setOriginCoords] = useState({ lat: "", lng: "" });
  const [destinationCoords, setDestinationCoords] = useState({ lat: "", lng: "" });
  const [selectedJob, setSelectedJob] = useState(null);
  const [mode, setMode] = useState("login");
  const [activeStep, setActiveStep] = useState(1);
  const [aiMessage, setAiMessage] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [jobs, setJobs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, message: "" });
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "customer" });

  const [jobForm, setJobForm] = useState({
    customerName: "",
    phone: "",
    origin: "",
    destination: "",
    serviceType: "Full Move",
    inventory: "",
    date: "",
    time: "",
    estimatedDuration: 2,
    distanceKm: "",
  });

  const [teamForm, setTeamForm] = useState({ teamName: "", members: "", availability: "", capacity: 2 });

  const authHeader = useMemo(() => ({ headers: { Authorization: token } }), [token]);

  useEffect(() => {
    const timer = setInterval(() => setActiveStep((prev) => (prev < 5 ? prev + 1 : 1)), 1800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchPricing();
    if (token) {
      fetchJobs();
      fetchTeams();
      fetchReviews();
    }
  }, [token]);

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 4000);
  };

  const fetchPricing = async () => {
    try {
      const res = await axios.get(`${API}/pricing`);
      setPricing((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      showError(err.response?.data?.message || "Could not load pricing");
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/jobs`, authHeader);
      setJobs(res.data);
    } catch (err) {
      showError(err.response?.data?.message || "Could not load jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${API}/teams`, authHeader);
      setTeams(res.data);
    } catch (err) {
      showError(err.response?.data?.message || "Could not load teams");
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API}/reviews`);
      setReviews(res.data);
    } catch (err) {
      showError(err.response?.data?.message || "Could not load reviews");
    }
  };

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
  };

  const geocodeAddress = async (address) => {
    if (!address.trim()) throw new Error("Address is required");

    // Backend should call a real geocoding service using a private API key.
    // Example backend route: GET /api/geocode?address=Berlin
    const res = await axios.get(`${API}/geocode`, {
      params: { address },
      headers: { Authorization: token },
    });

    return res.data; // expected { lat, lng }
  };

  const calculateRouteFromAddresses = async () => {
  try {
    if (!jobForm.origin || !jobForm.destination) {
      alert("Please enter origin and destination addresses first");
      return;
    }

    const originResponse = await fetch(
      `http://localhost:5000/api/geocode?address=${encodeURIComponent(
        jobForm.origin
      )}`
    );

    const destinationResponse = await fetch(
      `http://localhost:5000/api/geocode?address=${encodeURIComponent(
        jobForm.destination
      )}`
    );

    if (!originResponse.ok || !destinationResponse.ok) {
      throw new Error("Could not find address");
    }

    const origin = await originResponse.json();
    const destination = await destinationResponse.json();

    setOriginCoords(origin);
    setDestinationCoords(destination);

    const distance = calculateDistanceKm(
      Number(origin.lat),
      Number(origin.lng),
      Number(destination.lat),
      Number(destination.lng)
    );

    setJobForm((prev) => ({
      ...prev,
      distanceKm: distance,
    }));

    alert(`Route calculated: ${distance} km`);
  } catch (err) {
    console.log("ROUTE ERROR:", err);
    alert(err.message || "Route calculation failed");
  }
};
  const calculateInventoryCharge = () => {
    const inventory = jobForm.inventory.toLowerCase();
    let charge = 0;
    const boxMatch = inventory.match(/(\d+)\s*box/);
    if (boxMatch) charge += Number(boxMatch[1]) * Number(pricing.inventoryBoxRate || 10);
    ["sofa", "bed", "fridge", "washing machine", "wardrobe", "table", "tv"].forEach((item) => {
      if (inventory.includes(item)) charge += Number(pricing.heavyItemRate || 80);
    });
    return charge;
  };

  const calculateTimeCharge = () => {
    if (!jobForm.time) return 0;
    const hour = Number(jobForm.time.split(":")[0]);
    return hour >= 18 || hour < 8 ? Number(pricing.eveningCharge || 100) : 0;
  };

  const calculateLiveQuote = () => {
    const basePrice =
      jobForm.serviceType === "Full Move"
        ? pricing.fullMoveBase
        : jobForm.serviceType === "Transport Only"
        ? pricing.transportOnlyBase
        : pricing.packingHelpBase;

    return (
      Number(basePrice || 0) +
      Number(jobForm.estimatedDuration || 0) * Number(pricing.perHourRate || 0) +
      Number(jobForm.distanceKm || 0) * Number(pricing.perKmRate || 0) +
      calculateInventoryCharge() +
      calculateTimeCharge()
    );
  };

  const visibleJobs = useMemo(() => {
    // Frontend filter. Backend should also return only allowed jobs.
    if (role === "customer") {
      return jobs.filter((job) => job.customerEmail === email || job.customerName === name);
    }
    return jobs;
  }, [jobs, role, email, name]);

  const filteredJobs = visibleJobs.filter((job) => {
    const matchesStatus = filter === "All" || job.status === filter;
    const matchesSearch = job.customerName?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedDetailJob = jobs.find((job) => job._id === jobDetailId);

  const totalJobs = visibleJobs.length;
  const completedJobs = visibleJobs.filter((job) => job.status === "Completed").length;
  const pendingJobs = visibleJobs.filter((job) => job.status === "Pending").length;
  const totalRevenue = visibleJobs.filter((job) => job.paymentStatus === "Paid").reduce((sum, job) => sum + Number(job.price || 0), 0);
  const unpaidJobs = visibleJobs.filter((job) => job.paymentStatus === "Unpaid").length;
  const unpaidRevenue = visibleJobs.filter((job) => job.paymentStatus === "Unpaid").reduce((sum, job) => sum + Number(job.price || 0), 0);
  const depositRevenue = visibleJobs.filter((job) => job.paymentStatus === "Deposit Paid").reduce((sum, job) => sum + Number(job.price || 0), 0);

  const serviceChartData = [
    { name: "Full Move", value: visibleJobs.filter((job) => job.serviceType === "Full Move").length },
    { name: "Transport Only", value: visibleJobs.filter((job) => job.serviceType === "Transport Only").length },
    { name: "Packing Help", value: visibleJobs.filter((job) => job.serviceType === "Packing Help").length },
  ];

  const revenueChartData = [
    { name: "Paid", amount: totalRevenue },
    { name: "Unpaid", amount: unpaidRevenue },
    { name: "Deposit", amount: depositRevenue },
  ];

  const monthlyChartData = Object.values(
    visibleJobs.reduce((acc, job) => {
      const date = job.createdAt ? new Date(job.createdAt) : new Date();
      const month = date.toLocaleString("default", { month: "short" });
      if (!acc[month]) acc[month] = { month, bookings: 0 };
      acc[month].bookings += 1;
      return acc;
    }, {})
  );

  const monthlyBookings = visibleJobs.filter((job) => {
    if (!job.createdAt) return false;
    const jobDate = new Date(job.createdAt);
    const today = new Date();
    return jobDate.getMonth() === today.getMonth() && jobDate.getFullYear() === today.getFullYear();
  }).length;

  const handleAuthChange = (e) => setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  const handleJobChange = (e) => setJobForm({ ...jobForm, [e.target.name]: e.target.value });
  const handleTeamChange = (e) => setTeamForm({ ...teamForm, [e.target.name]: e.target.value });

  const register = async (e) => {
    e.preventDefault();
    if (authForm.password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    try {
      await axios.post(`${API}/auth/register`, { ...authForm, email: authForm.email.trim().toLowerCase() });
      alert("Registered successfully. Now login.");
      setMode("login");
      setPage("login");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
    
  };


  const login = async (e) => {
    e.preventDefault();
    try {
      const loginEmail = authForm.email.trim().toLowerCase();
      const res = await axios.post(`${API}/auth/login`, { email: loginEmail, password: authForm.password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("name", res.data.name);
      localStorage.setItem("email", loginEmail);
      setToken(res.data.token);
      setRole(res.data.role);
      setName(res.data.name);
      setEmail(loginEmail);
      setPage("dashboard");
      alert("Login successful");

      
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  const resetPassword = async (e) => {
  e.preventDefault();

  try {
    await axios.post(`${API}/auth/reset-password`, {
      email: resetForm.email.trim().toLowerCase(),
      newPassword: resetForm.newPassword,
    });

    alert("Password reset successful. Please login.");
    setMode("login");
    setResetForm({ email: "", newPassword: "" });
  } catch (err) {
    alert(err.response?.data?.message || "Password reset failed");
  }
};
  const logout = () => {
    localStorage.clear();
    setToken("");
    setRole("");
    setName("");
    setEmail("");
    setJobs([]);
    setTeams([]);
    setPage("home");
    setMode("login");
  };

  const getAutoAssignedTeam = () => {
    const availableTeam = teams.find((team) => Number(team.capacity) >= Number(jobForm.estimatedDuration));
    return availableTeam ? availableTeam.teamName : "Not Assigned";
  };

  const createJob = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/jobs`,
        {
          ...jobForm,
          customerEmail: email,
          price: calculateLiveQuote(),
          originCoords,
          destinationCoords,
        },
        authHeader
      );
      alert("Booking created successfully!");
      setJobForm({ customerName: "", phone: "", origin: "", destination: "", serviceType: "Full Move", inventory: "", date: "", time: "", estimatedDuration: 2, distanceKm: "" });
      setOriginCoords({ lat: "", lng: "" });
      setDestinationCoords({ lat: "", lng: "" });
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.message || "Booking failed");
    }
  };

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/teams`, teamForm, authHeader);
      setTeamForm({ teamName: "", members: "", availability: "", capacity: 2 });
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || "Team creation failed");
    }
  };

  const updateJob = async (id, data) => {
    try {
      await axios.put(`${API}/jobs/${id}`, data, authHeader);
      await fetchJobs();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  };

  const updatePricing = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API}/pricing`, pricing, authHeader);
      setPricing((prev) => ({ ...prev, ...res.data }));
      alert("Pricing updated successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Pricing update failed");
    }
  };

  const sendMessage = async (jobId, message) => {
    try {
      await axios.post(`${API}/jobs/${jobId}/messages`, { senderName: name, message }, authHeader);
      fetchJobs();
    } catch (err) {
      alert("Message failed");
    }
  };

  const deleteJob = async (job) => {
    if (!["Completed", "Cancelled"].includes(job.status)) {
      alert("Only completed or cancelled jobs can be deleted.");
      return;
    }
    const confirmText = window.prompt(`Type DELETE ${job.customerName} to confirm deletion`);
    if (confirmText !== `DELETE ${job.customerName}`) return;
    try {
      await axios.delete(`${API}/jobs/${job._id}`, authHeader);
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const deleteTeam = async (id) => {
    try {
      await axios.delete(`${API}/teams/${id}`, authHeader);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const startPayment = async (job, type) => {
  try {
    const amount = type === "deposit" ? Math.round(job.price * 0.3) : job.price;

    const res = await fetch("http://localhost:5000/api/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });

    const order = await res.json();

    if (!order.id) {
      alert(order.message || "Order creation failed");
      return;
    }

    if (!window.Razorpay) {
      alert("Razorpay script not loaded");
      return;
    }

    const options = {
      key: "rzp_test_Sk6RGOkxhqLznN",
      amount: order.amount,
      currency: "INR",
      name: "VAN MAN",
      description: type === "deposit" ? "Deposit Payment" : "Full Payment",
      order_id: order.id,
      handler: async function () {
  await updateJob(job._id, {
    paymentStatus: type === "deposit" ? "Deposit Paid" : "Paid",
  });

  await fetchJobs(); // refresh UI
  alert("Payment successful ✅");
},
      theme: {
        color: "#c91414",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    console.log("PAYMENT ERROR:", err);
    alert("Payment failed to start");
  }
};

  const printInvoice = (job) => {
    const html = `
      <html><head><title>Invoice</title></head><body>
      <h1>VAN MAN Invoice</h1>
      <p><b>Customer:</b> ${job.customerName}</p>
      <p><b>Service:</b> ${job.serviceType}</p>
      <p><b>Route:</b> ${job.origin} → ${job.destination}</p>
      <p><b>Date:</b> ${job.date} ${job.time}</p>
      <p><b>Distance:</b> ${job.distanceKm} km</p>
      <p><b>Amount:</b> €{job.price}</p>
      <p><b>Payment:</b> ${job.paymentStatus}</p>
      <p><b>Status:</b> ${job.status}</p>
      </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const renderRouteMap = (job = null) => {
    const o = job?.originCoords || originCoords;
    const d = job?.destinationCoords || destinationCoords;

    if (!o?.lat || !o?.lng || !d?.lat || !d?.lng) {
      return <p className="empty-state">Map route will appear after coordinates are available.</p>;
    }

    const origin = [Number(o.lat), Number(o.lng)];
    const destination = [Number(d.lat), Number(d.lng)];

    return (
      <div className="map-box">
        <MapContainer center={origin} zoom={11} scrollWheelZoom={false} style={{ height: "320px", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={origin} icon={markerIcon}><Popup>Origin</Popup></Marker>
          <Marker position={destination} icon={markerIcon}><Popup>Destination</Popup></Marker>
          <Polyline positions={[origin, destination]} />
        </MapContainer>
      </div>
    );
  };

  const renderChatBox = (job, placeholderText) => (
    <div className="chat-box">
      <h4>💬 Job Chat</h4>
      <div className="chat-messages">
        {(job.messages || []).length > 0 ? (
          job.messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.senderRole === role ? "mine" : "theirs"}`}>
              <div className="chat-bubble">
                <b>{msg.senderName || msg.senderRole}</b>
                <p>{msg.message}</p>
                <small>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}</small>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">No messages yet</p>
        )}
      </div>
      <input
        placeholder={placeholderText}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.value.trim()) {
            sendMessage(job._id, e.target.value.trim());
            e.target.value = "";
          }
        }}
      />
    </div>
  );

  const renderJobDetailPage = (job) => {
    if (!job) return <p className="empty-state">Job not found.</p>;

    return (
      <section className="section job-detail-page">
        <button onClick={() => { setJobDetailId(null); setPage("dashboard"); }}>← Back to Dashboard</button>
        <div className="job-detail-header">
          <div>
            <p className="section-label">Job Detail View</p>
            <h2>{job.customerName}</h2>
            <p>{job.origin} → {job.destination}</p>
          </div>
          <span className={`status ${job.status.replace(" ", "-")}`}>{job.status}</span>
        </div>

        <div className="job-summary">
          <p><b>Phone:</b> {job.phone}</p>
          <p><b>Service:</b> {job.serviceType}</p>
          <p><b>Inventory:</b> {job.inventory}</p>
          <p><b>Date:</b> {job.date}</p>
          <p><b>Time:</b> {job.time}</p>
          <p><b>Distance:</b> {job.distanceKm} km</p>
          <p><b>Duration:</b> {job.estimatedDuration} hrs</p>
          <p><b>Team:</b> {job.assignedTeam}</p>
          <p><b>Price:</b> €{job.price}</p>
          <p><b>Payment:</b> {job.paymentStatus}</p>
        </div>

        <h3>Route Tracking</h3>
        {renderRouteMap(job)}

        {role === "admin" && (
          <div className="admin-actions">
            <h4>Team/Admin Updates</h4>
            <div className="action-grid">
              <div>
                <label>Status</label>
                <select value={job.status} onChange={(e) => updateJob(job._id, { status: e.target.value })}>
                  <option>Pending</option><option>Confirmed</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
                </select>
              </div>
              <div>
                <label>Payment</label>
                <select value={job.paymentStatus} onChange={(e) => updateJob(job._id, { paymentStatus: e.target.value })}>
                  <option>Unpaid</option><option>Deposit Paid</option><option>Paid</option>
                </select>
              </div>
              <div>
                <label>Assign Team</label>
                <select value={job.assignedTeam} onChange={(e) => updateJob(job._id, { assignedTeam: e.target.value })}>
                  <option>Not Assigned</option>
                  {teams.map((team) => <option key={team._id}>{team.teamName}</option>)}
                </select>
              </div>
              <div>
                <label>Notification</label>
                <input placeholder="Type and press Enter" onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    updateJob(job._id, { newNotification: e.target.value.trim() });
                    e.target.value = "";
                  }
                }} />
              </div>
            </div>
          </div>
        )}

        {renderChatBox(job, "Type message and press Enter...")}

        <button onClick={() => printInvoice(job)}>Print Invoice</button>
        {role === "admin" && ["Completed", "Cancelled"].includes(job.status) && (
          <button className="danger" onClick={() => deleteJob(job)}>Delete Job</button>
        )}
      </section>
    );
  };

  const renderCustomerJobCard = (job) => {
    const isClosed = job.status === "Completed" || job.status === "Cancelled";
    return (
      <div className="job-card clean-job-card" key={job._id}>
        <div className="clean-job-header">
          <div><h3>{job.customerName}</h3><p>📍 {job.origin} → {job.destination}</p></div>
          <span className={`status ${job.status.replace(" ", "-")}`}>{job.status}</span>
        </div>
        <div className="clean-job-info">
          <p>🚚 {job.serviceType}</p><p>📦 {job.inventory}</p><p>📏 {job.distanceKm} km</p><p>📅 {job.date} | ⏰ {job.time}</p><p>👷 Team: {job.assignedTeam}</p>
        </div>
        <button type="button" onClick={() => { setJobDetailId(job._id); setPage("jobDetail"); }}>Open Job Detail</button>
        <div className="clean-price-row">
          <div><small>Quote</small><h2>€{job.price}</h2></div>
          <div><small>Payment</small><span className={`payment-pill ${job.paymentStatus.replace(" ", "-")}`}>{job.paymentStatus}</span></div>
        </div>
        {job.paymentStatus !== "Paid" && (
          <div className="payment-actions">
            {job.paymentStatus === "Unpaid" && <button onClick={() => startPayment(job, "deposit")}>Pay Deposit</button>}
            <button onClick={() => startPayment(job, "full")}>Pay Full Amount</button>
          </div>
        )}
        <div className="booking-actions">
          <h4>Manage Booking</h4>
          {!isClosed ? (
            <>
              <input type="date" onChange={(e) => e.target.value && updateJob(job._id, { date: e.target.value })} />
              <input type="time" onChange={(e) => e.target.value && updateJob(job._id, { time: e.target.value })} />
              <button className="danger" onClick={() => window.confirm("Cancel this booking?") && updateJob(job._id, { status: "Cancelled" })}>Cancel Booking</button>
            </>
          ) : <p className="closed-text">This booking is closed.</p>}
        </div>
        {renderChatBox(job, "Type message and press Enter...")}
        <button onClick={() => printInvoice(job)}>Print Invoice</button>
      </div>
    );
  };

  const askAI = async () => {
    try {
      if (!aiMessage.trim()) return alert("Please type a message");
      const res = await axios.post(`${API}/ai/assistant`, { message: aiMessage });
      setAiReply(res.data.reply);
    } catch (err) {
      alert(err.response?.data?.error || "AI error");
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      const completedJobWithTeam = visibleJobs.filter((job) => job.status === "Completed" && job.assignedTeam && job.assignedTeam !== "Not Assigned").sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];
      await axios.post(`${API}/reviews`, { customerName: name, teamName: completedJobWithTeam?.assignedTeam || "Not Assigned", rating: reviewForm.rating, message: reviewForm.message });
      alert("Feedback submitted successfully!");
      setReviewForm({ rating: 5, message: "" });
      fetchReviews();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit feedback");
    }
  };

  return (
    <div className="app">
      {error && <div className="toast-error">{error}</div>}

      <nav className="navbar">
        <div className="brand" onClick={() => setPage("home")}>
          <div className="brand-main">🚚 VAN MAN</div>
          <div className="brand-sub">Young & Fast Moving</div>
        </div>
        <div className="nav-links">
          <a onClick={() => setPage("home")} href="#services">Services</a>
          <a onClick={() => setPage("home")} href="#about">About</a>
          <a onClick={() => setPage("home")} href="#process">Process</a>
          <a href="#contact">Contact</a>
          {token && <a onClick={() => setPage("dashboard")} href="#dashboard">Dashboard</a>}
        </div>
        <div className="nav-actions">
          {token ? (
            <div className="profile-menu">
              <button className="profile-avatar">{name ? name.charAt(0).toUpperCase() : "U"}</button>
              <div className="profile-dropdown"><h4>{name}</h4><p>{role}</p><p>{email}</p><button onClick={() => setPage("dashboard")}>Dashboard</button><button onClick={logout}>Logout</button></div>
            </div>
          ) : <button className="login-btn" onClick={() => { setPage("login"); setMode("login"); }}>Login</button>}
        </div>
      </nav>

      {page === "jobDetail" && renderJobDetailPage(selectedDetailJob)}

      {page === "home" && (
        <>
          <section className="hero" id="home">
            <div className="hero-content">
              <p className="tagline">VAN MAN · YOUNG & FAST</p>
              <h1>Hilfe Beim Umzug?</h1>
              <h2>(Help with moving?)</h2>

              <p className="hero-subtitle">We are a team of strong young students offering affordable moving and transport help.</p>

              <p className="hero-motto">Sie helfen uns, indem wir Ihnen helfen(You help us by us
helping you)</p>
              <div className="hero-actions"><button type="button" className="primary-btn" onClick={() => token ? setPage("dashboard") : setPage("login")}>Get Free Quote</button><br /><a href="#contact" className="secondary-btn">📞 WhatsApp / Call</a></div>
            </div>
            <div className="hero-image-card"><img src={heroImg} alt="Moving service" /></div>
          </section>
          <section className="section about-section" id="about">
  <p className="section-label">About</p>

  <h2 className="section-title">About VAN MAN</h2>

  <div className="about-card">
    <p>
      VAN MAN is a young and fast moving service that helps customers with
      affordable transport, packing, loading, unloading, and relocation support.
      Inspired by student-based moving services, we focus on delivering quick,
      reliable, and cost-effective moving solutions.
    </p>

    <p>
      Our platform offers modern features such as live pricing, smart team
      assignment, secure payments, and real-time job tracking to ensure a smooth
      and hassle-free moving experience.
    </p>
  </div>
</section>
          <section className="section"><div className="ai-box"><h3>🤖 AI Moving Assistant</h3><input type="text" placeholder="Ask: I want to move a 2BHK with sofa" value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} /><button type="button" onClick={askAI}>Ask AI</button>{aiReply && <div className="ai-reply"><b>Response:</b><p>{aiReply}</p></div>}</div></section>
          <section className="section" id="services"><p className="section-label">Services</p><h2>We Make Moving Easy</h2><div className="service-grid"><div className="service-card"><span>🏠</span><h3>Full Move</h3><p>Packing, loading, transport and unloading.</p></div><div className="service-card"><span>🚛</span><h3>Transport Only</h3><p>Safe and quick item transportation.</p></div><div className="service-card"><span>📦</span><h3>Packing Help</h3><p>Student team support for packing and lifting.</p></div><div className="service-card"><span>📍</span><h3>Tracking</h3><p>Track job status and assigned team.</p></div></div></section>

          <section className="process-section" id="process">
  <p className="process-small-title">How It Works</p>
  <h2>Book your move in a few simple steps</h2>

  <div className="truck-progress">
    <div className={`moving-truck step-${activeStep}`}>🚚</div>

    {[1, 2, 3, 4, 5].map((step) => (
      <div
        key={step}
        className={`progress-dot ${activeStep >= step ? "active" : ""}`}
      >
        {step}
      </div>
    ))}
  </div>

  <div className="process-wrapper">
    <div className={`process-row ${activeStep >= 1 ? "completed" : ""}`}>
      <div className="process-illustration">📝</div>
      <div className="process-circle">1</div>
      <div className="process-text">
        <h3>Enter Move Details</h3>
        <p>
          Add pickup address, destination, service type, inventory, date and time.
          You can also use our AI Assistant for quick moving guidance.
        </p>
      </div>
    </div>

    <div className={`process-row reverse ${activeStep >= 2 ? "completed" : ""}`}>
      <div className="process-illustration">💶</div>
      <div className="process-circle">2</div>
      <div className="process-text">
        <h3>Get Instant Quote</h3>
        <p>
          Our system calculates a live quote based on distance, estimated hours,
          inventory items, service type and moving time.
        </p>
      </div>
    </div>

    <div className={`process-row ${activeStep >= 3 ? "completed" : ""}`}>
      <div className="process-illustration">📅</div>
      <div className="process-circle">3</div>
      <div className="process-text">
        <h3>Confirm Booking</h3>
        <p>
          Choose your preferred moving date and time. Your booking is created
          instantly and saved in your customer dashboard.
        </p>
      </div>
    </div>

    <div className={`process-row reverse ${activeStep >= 4 ? "completed" : ""}`}>
      <div className="process-illustration">👷</div>
      <div className="process-circle">4</div>
      <div className="process-text">
        <h3>Team Assigned</h3>
        <p>
          VAN MAN assigns an available team based on capacity, schedule and
          availability so the same team is not double-booked.
        </p>
      </div>
    </div>

    <div className={`process-row ${activeStep >= 5 ? "completed" : ""}`}>
      <div className="process-illustration">💳</div>
      <div className="process-circle">5</div>
      <div className="process-text">
        <h3>Pay, Move & Track</h3>
        <p>
          Pay deposit or full amount securely, track job status, chat with the
          team and receive updates until your move is completed.
        </p>
      </div>
    </div>
  </div>
</section>
        </>
      )}

      {page === "login" && !token && (
  <section className="auth-page" id="login">
    <div className="auth-card">
      <h1>🚚 VAN MAN</h1>
      <h2>
        {mode === "login"
          ? "Login"
          : mode === "register"
          ? "Register"
          : "Reset Password"}
      </h2>

      {mode === "forgot" ? (
        <form onSubmit={resetPassword}>
          <input
            placeholder="Registered Email"
            value={resetForm.email}
            onChange={(e) =>
              setResetForm({ ...resetForm, email: e.target.value })
            }
            required
          />

          <input
            type="password"
            placeholder="New Password"
            value={resetForm.newPassword}
            onChange={(e) =>
              setResetForm({ ...resetForm, newPassword: e.target.value })
            }
            required
          />

          <button type="submit">Reset Password</button>

          <p>
            Remember password?{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => setMode("login")}
            >
              Login
            </button>
          </p>
        </form>
      ) : (
        <>
          <form onSubmit={mode === "login" ? login : register}>
            {mode === "register" && (
              <>
                <input
                  name="name"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={handleAuthChange}
                  required
                />

                <select
                  name="role"
                  value={authForm.role}
                  onChange={handleAuthChange}
                >
                  <option value="customer">Customer</option>
                </select>
              </>
            )}

            <input
              name="email"
              placeholder="Email"
              value={authForm.email}
              onChange={handleAuthChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={authForm.password}
              onChange={handleAuthChange}
              required
            />

            <button type="submit">
              {mode === "login" ? "Login" : "Register"}
            </button>
          </form>

          {mode === "login" && (
            <button
              type="button"
              className="link-btn"
              onClick={() => setMode("forgot")}
            >
              Forgot password?
            </button>
          )}

          <p>
            {mode === "login" ? "New user?" : "Already registered?"}{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                setMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login" ? "Create account" : "Login here"}
            </button>
          </p>
        </>
      )}
    </div>
  </section>
)}

      {page === "dashboard" && token && (
        <section className="stats"><div><h2>{totalJobs}</h2><p>Total Jobs</p></div><div><h2>{completedJobs}</h2><p>Completed Jobs</p></div><div><h2>{pendingJobs}</h2><p>Pending Jobs</p></div></section>
      )}

      {page === "dashboard" && role === "customer" && (
        <section className="section customer-dashboard" id="dashboard">
          <p className="section-label">Customer Dashboard</p><h2>Manage Your Move</h2>
          <div className="dashboard-grid"><div className="dashboard-card"><h3>Book Moving Service</h3><p>Create booking, get quote, and track your moving status.</p><form className="booking-form" onSubmit={createJob}>
            <input name="customerName" placeholder="Customer Name" value={jobForm.customerName} onChange={handleJobChange} required />
            <input name="phone" placeholder="Phone / WhatsApp" value={jobForm.phone} onChange={handleJobChange} required />
            <input name="origin" placeholder="Origin Address" value={jobForm.origin} onChange={handleJobChange} required />
            <input name="destination" placeholder="Destination Address" value={jobForm.destination} onChange={handleJobChange} required />
            <button type="button" onClick={calculateRouteFromAddresses}>📍 Auto Calculate Route</button>
            {renderRouteMap()}
            <select name="serviceType" value={jobForm.serviceType} onChange={handleJobChange}><option>Full Move</option><option>Transport Only</option><option>Packing Help</option></select>
            <textarea name="inventory" placeholder="Inventory: 10 boxes, sofa, washing machine..." value={jobForm.inventory} onChange={handleJobChange} required />
            <input type="date" name="date" value={jobForm.date} onChange={handleJobChange} required />
            <input type="time" name="time" value={jobForm.time} onChange={handleJobChange} required />
            <input type="number" name="estimatedDuration" placeholder="Estimated Duration Hours" value={jobForm.estimatedDuration} onChange={handleJobChange} required />
            <input type="number" name="distanceKm" placeholder="Distance (KM)" value={jobForm.distanceKm} onChange={handleJobChange} required />
            <div className="quote-box"><h3>Estimated Quote</h3><p>€{calculateLiveQuote()}</p><small>Includes base price, distance, hours, inventory, and time charge.</small></div>
            <button type="submit" disabled={loading}>{loading ? "Saving..." : "Book Move & Generate Quote"}</button>
          </form></div>
          <div className="dashboard-card"><h3>Share Your Experience</h3><form className="feedback-form" onSubmit={submitReview}><select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}><option value={5}>⭐⭐⭐⭐⭐ Excellent</option><option value={4}>⭐⭐⭐⭐ Good</option><option value={3}>⭐⭐⭐ Average</option><option value={2}>⭐⭐ Poor</option><option value={1}>⭐ Very Poor</option></select><textarea placeholder="Write your feedback..." value={reviewForm.message} onChange={(e) => setReviewForm({ ...reviewForm, message: e.target.value })} required /><button type="submit">Submit Feedback</button></form></div></div>
          <div className="dashboard-card full-width"><h3>My Bookings</h3><div className="filters"><input placeholder="Search by customer name..." value={search} onChange={(e) => setSearch(e.target.value)} />{["All", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled"].map((s) => <button key={s} onClick={() => setFilter(s)}>{s}</button>)}</div>{loading ? <p>Loading jobs...</p> : filteredJobs.length === 0 ? <p className="empty-state">No bookings found.</p> : <div className="cards">{filteredJobs.map(renderCustomerJobCard)}</div>}</div>
        </section>
      )}

      {page === "dashboard" && role === "admin" && (
        <>
          <section className="section"><p className="section-label">Admin Analytics</p><h2>Business Overview</h2><div className="analytics-grid"><div className="analytics-card revenue"><div><p>Total Revenue</p><h3>₹{totalRevenue}</h3></div><span>💰</span></div><div className="analytics-card unpaid"><div><p>Unpaid Jobs</p><h3>{unpaidJobs}</h3></div><span>⚠️</span></div><div className="analytics-card pending"><div><p>Pending Jobs</p><h3>{pendingJobs}</h3></div><span>⏳</span></div><div className="analytics-card completed"><div><p>Completed Jobs</p><h3>{completedJobs}</h3></div><span>✅</span></div><div className="analytics-card monthly"><div><p>This Month</p><h3>{monthlyBookings}</h3></div><span>📅</span></div></div>
          <div className="real-chart-grid"><div className="real-chart-card"><h3>Jobs By Service Type</h3><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={serviceChartData} dataKey="value" nameKey="name" outerRadius={85} label>{serviceChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div><div className="real-chart-card"><h3>Revenue Overview</h3><ResponsiveContainer width="100%" height={260}><BarChart data={revenueChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#ff7a1a" /></BarChart></ResponsiveContainer></div><div className="real-chart-card full-chart"><h3>Monthly Bookings</h3><ResponsiveContainer width="100%" height={260}><LineChart data={monthlyChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="bookings" stroke="#c91414" strokeWidth={3} /></LineChart></ResponsiveContainer></div></div></section>

        <section className="section">
  <p className="section-label">Pricing Management</p>
  <h2>Manage Pricing Rules</h2>

  <form className="pricing-form" onSubmit={updatePricing}>
    {[
      ["fullMoveBase", "Full Move Base", "🏠"],
      ["transportOnlyBase", "Transport Only Base", "🚛"],
      ["packingHelpBase", "Packing Help Base", "📦"],
      ["perHourRate", "Per Hour Rate", "⏱️"],
      ["perKmRate", "Per KM Rate", "📍"],
      ["inventoryBoxRate", "Inventory Box Rate", "📦"],
      ["heavyItemRate", "Heavy Item Rate", "🏋️"],
      ["eveningCharge", "Evening Charge", "🌙"],
    ].map(([key, label, icon]) => (
      <div className="pricing-field" key={key}>
        <span className="pricing-icon">{icon}</span>
        <label>{label}</label>
        <input
          type="number"
          value={pricing[key] || ""}
          onChange={(e) =>
            setPricing({
              ...pricing,
              [key]: e.target.value,
            })
          }
        />
      </div>
    ))}

    <button type="submit" className="pricing-submit">
      Update Pricing
    </button>
  </form>
</section>

          <section className="section booking-section"><div><p className="section-label left">Admin Dashboard</p><h2>Team Management</h2><p>Admins can add teams, manage availability, assign teams, update status, manage payments, and send job updates.</p></div><form className="booking-form" onSubmit={createTeam}><input name="teamName" placeholder="Team Name" value={teamForm.teamName} onChange={handleTeamChange} required /><input name="members" placeholder="Members" value={teamForm.members} onChange={handleTeamChange} required /><select name="availability" value={teamForm.availability} onChange={handleTeamChange} required><option value="">Select Availability</option><option value="Available">Available</option><option value="Unavailable">Unavailable</option><option value="Morning Shift">Morning Shift</option><option value="Evening Shift">Evening Shift</option><option value="Weekend Only">Weekend Only</option></select><input type="number" name="capacity" value={teamForm.capacity} onChange={handleTeamChange} /><button type="submit">Add Team</button></form></section>

          <section className="section">
  <p className="section-label">Team Calendar</p>
  <h2>Assigned Jobs Calendar</h2>

  <div className="calendar-grid">
    {filteredJobs
      .filter(
        (job) =>
          job.assignedTeam &&
          job.assignedTeam !== "Not Assigned" &&
          job.date &&
          job.time &&
          job.status !== "Cancelled"
      )
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time}`) -
          new Date(`${b.date}T${b.time}`)
      ).length === 0 ? (
      <p className="empty-state">No assigned jobs scheduled.</p>
    ) : (
      filteredJobs
        .filter(
          (job) =>
            job.assignedTeam &&
            job.assignedTeam !== "Not Assigned" &&
            job.date &&
            job.time &&
            job.status !== "Cancelled"
        )
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.time}`) -
            new Date(`${b.date}T${b.time}`)
        )
        .map((job) => (
          <div className="calendar-card pretty-calendar-card" key={job._id}>
            <div className="calendar-date">
              <span>📅</span>
              <h3>{job.date}</h3>
            </div>

            <div className="calendar-info">
              <p>⏰ {job.time}</p>
              <p>👷 {job.assignedTeam}</p>
              <p>👤 {job.customerName}</p>
            </div>

            <span className={`status ${job.status.replace(" ", "-")}`}>
              {job.status}
            </span>
          </div>
        ))
    )}
  </div>
</section>

          <section className="section"><p className="section-label">Teams</p><h2>Available Teams</h2><div className="cards">{teams.length === 0 ? <p className="empty-state">No teams available.</p> : teams.map((team) => <div className="job-card" key={team._id}><h3>{team.teamName}</h3><p><b>Members:</b> {team.members}</p><p><b>Availability:</b> {team.availability}</p><p><b>Capacity:</b> {team.capacity}</p><button className="danger" onClick={() => deleteTeam(team._id)}>Delete Team</button></div>)}</div></section>

          <section className="section"><p className="section-label">Customer Reviews</p><h2>Feedback From Customers</h2><div className="cards">{reviews.length === 0 ? <div className="job-card"><h3>No reviews yet</h3><p>Customer feedback will appear here.</p></div> : reviews.map((review) => <div className="job-card" key={review._id}><h3>{review.customerName}</h3><p><b>Team:</b> {review.teamName || "Not Assigned"}</p><p>{"⭐".repeat(review.rating)}</p><p>{review.message}</p><small>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</small></div>)}</div></section>

          <section className="section"><p className="section-label">Admin Dashboard</p><h2>All Jobs</h2><div className="filters"><input placeholder="Search by customer name..." value={search} onChange={(e) => setSearch(e.target.value)} />{["All", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled"].map((s) => <button key={s} onClick={() => setFilter(s)}>{s}</button>)}</div>{loading ? <p>Loading jobs...</p> : filteredJobs.length === 0 ? <p className="empty-state">No jobs found.</p> : <div className="admin-job-grid">{filteredJobs.map((job) => <div className="admin-job-card" key={job._id}><div className="job-card-header"><div><h3>{job.customerName}</h3><p>{job.origin} → {job.destination}</p></div><span className={`status ${job.status.replace(" ", "-")}`}>{job.status}</span></div><button type="button" onClick={() => { setJobDetailId(job._id); setPage("jobDetail"); }}>Open Job Detail</button><div className="job-summary"><p><b>Phone:</b> {job.phone}</p><p><b>Service:</b> {job.serviceType}</p><p><b>Date:</b> {job.date}</p><p><b>Time:</b> {job.time}</p><p><b>Price:</b> €{job.price}</p><p><b>Payment:</b> {job.paymentStatus}</p></div>{["Completed", "Cancelled"].includes(job.status) && <button className="delete-btn" onClick={() => deleteJob(job)}>Delete Job</button>}</div>)}</div>}</section>
        </>
      )}

      <footer id="contact"><h3>VAN MAN - Young & Fast</h3><p>Telefonisch oder WhatsApp · 0155xx109xx4</p></footer>
    </div>
  );
}

export default App;
