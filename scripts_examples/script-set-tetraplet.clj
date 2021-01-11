(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (history "set_tetraplet")
        ["12D3KooWBUJifCTgaxAUrcM9JysqCcS4CS8tiYH5hExbdWCAoNwb" "a38a396a-2b3d-4ef5-8b8b-ed448670bcfe" "is_authenticated" json_path] auth_result)
  (call %init_peer_id% (returnService "") [auth_result])
     ))
